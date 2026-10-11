---
name: adr-0019-onedrive-oauth-delegado-recebimento-duravel
description: Arquivos do cliente entram em bucket privado do Supabase, com confirmação durável antes de qualquer promessa ao cliente, e são transferidos ao OneDrive corporativo por trabalho persistente com lease. Autorização Microsoft é OAuth delegado da conta proprietária, com refresh token no Vault.
alwaysApply: false
---

# ADR-0019 — OneDrive: OAuth delegado, recebimento durável e transferência com lease

> **ADRs são imutáveis.** Não edite este arquivo; se a decisão mudar, crie um ADR que o substitua.

**Status:** Aceito
**Data:** 2026-10-11
**Decisores:** Lucas Azevedo (Akros/Trívia Studio)
**Relacionados:** ADR-0012 (cofre Vault e capability token), ADR-0008 (sessão),
ADR-0018 (participantes por papel), `specs/005-cliente-360-operacional/` (E03-S07)

## Contexto

A E03-S07 precisa receber arquivo real do cliente e colocá-lo na pasta do caso no **OneDrive
empresarial da Akros** — hoje a equipe recebe por e-mail/WhatsApp e move à mão. Três forças
decidem o desenho:

1. **A confirmação ao cliente não pode depender da Microsoft.** Se o Graph estiver fora, o cliente
   que enviou precisa continuar enviado, com o arquivo recuperável.
2. **Edge Function tem duração e memória finitas.** Transferir 20 MB com retomada não cabe em
   tarefa viva depois da resposta HTTP.
3. **O cliente nunca conecta conta Microsoft nem recebe credencial.** Quem autoriza é a conta
   corporativa proprietária da Akros, uma vez, pelo admin.

Sem decisão fixa, as alternativas se misturam na implementação e o resultado típico é "arquivo
criado na Microsoft, banco não atualizado" — duplicata silenciosa ou documento perdido.

## Decisão

**Fluxo em dois tempos: recebimento durável no Supabase Storage, depois transferência ao OneDrive
por trabalho persistente em Postgres.**

1. **Autorização**: OAuth **delegado** da conta corporativa proprietária, escopos
   `Files.ReadWrite` e `offline_access`, com `state` + PKCE. Iniciar e concluir a conexão é
   admin-only. Refresh token e client secret vivem no **Vault**, pelo mesmo padrão do ADR-0012
   (RPC `service_role`, valor nunca volta ao browser). A restrição à pasta autorizada é
   **validação do servidor** (drive + ancestralidade do item), porque o escopo delegado não isola
   pasta sozinho. Se a política do tenant exigir `Sites.Selected`/permissões selecionadas, a troca
   é registrada em ADR novo e comprovada no tenant — **não** se amplia silenciosamente.
2. **Recebimento**: o browser escreve em **bucket privado** `envios` do Supabase Storage, dentro de
   uma **reserva** criada pelo servidor (versão reservada, objeto permitido, tipo e tamanho
   declarados, expiração). TUS para retomada. Nenhuma URL pública, nenhum caminho escolhido pelo
   cliente.
3. **Confirmação**: o comando de finalizar verifica objeto, tamanho, MIME e reserva válida e, em
   **uma transação**, grava versão recebida, estado documental e o trabalho de transferência. Só
   então o cliente vê "recebido". Sem binário durável não há confirmação.
4. **Transferência**: um processador agendado (Supabase Cron, chamada autenticada por segredo no
   Vault) adquire trabalho por **lease**, cria sessão de upload no Graph e envia em fragmentos,
   com checkpoint. Nome técnico determinístico por versão evita duplicata. Resposta perdida obriga
   **reconciliar** o item esperado (existência, tamanho) antes de reenviar.
5. **Limpeza**: o objeto temporário só é apagado depois da confirmação do item final. Envio
   recebido e ainda não transferido **não expira** — vira alerta operacional. Reserva não
   finalizada expira em 24 horas.
6. **Download**: sempre por comando que verifica sessão, participação e papel, respondendo
   attachment. URL pré-autenticada do Graph é capacidade secreta: não é persistida, não vai a log,
   auditoria ou timeline, e não é entregue como link.

## Alternativas consideradas

| Alternativa | Prós | Contras | Por que (não) escolhida |
|---|---|---|---|
| **A — Storage privado + fila Postgres (escolhida)** | Confirmação independe da Microsoft; retomada e recuperação auditáveis; validação do binário antes de expor | Dois lugares com o arquivo durante a janela de transferência; limpeza e alerta próprios | Única que mantém a promessa ao cliente durante falha externa |
| **B — Upload direto do browser ao Graph** | Um salto a menos, sem cópia intermediária | Exige credencial/URL Microsoft perto do cliente; validação e confirmação ficam acopladas ao serviço externo; falha parcial sem dono | Rejeitada: move a confiança para fora do servidor |
| **C — Transferir na mesma invocação da Edge Function** | Implementação curta | Duração/memória finitas, retomada depende de processo vivo; timeout gera item órfão | Rejeitada: recuperação viraria trabalho manual |
| **D — Permissão de aplicação ampla no tenant** | Sem refresh token para manter | Acesso a todo o SharePoint/OneDrive da empresa por uma chave só | Rejeitada: excede o necessário para uma pasta por caso |

## Consequências

**Positivas**
- "Recebido", "armazenado" e "aprovado" passam a ser estados provados por dado, não por narrativa.
- Falha da Microsoft vira pendência visível e reprocessável, sem perder arquivo confirmado.
- O cliente nunca vê credencial, caminho ou link público; download sempre reavalia o papel.

**Negativas / trade-offs aceitos**
- Custo de armazenamento duplicado durante a janela de transferência, e uma rotina de limpeza que
  precisa existir e ser monitorada.
- Cron e segredo de processador são superfície nova: função interna que não aceita `clienteId`,
  `driveId` nem URL de caller público.
- Nome técnico determinístico no OneDrive é menos legível para quem abre a pasta pelo Explorer; o
  nome original fica como metadado e na UI da plataforma.
- A pasta autorizada é garantida por verificação de ancestralidade no servidor: um bug ali é
  acesso amplo ao drive da conta proprietária. Exige teste dedicado, não só revisão.
