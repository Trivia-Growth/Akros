---
name: adr-0021-evolution-confiavel
description: Conexão do canal Evolution pelo produto (servidor com versão provada, instância, webhook relido, QR e número esperado), nada de mensagem descartada em silêncio e vínculo com cliente só quando único.
alwaysApply: false
---

# ADR-0021 — Evolution confiável: conectar pelo produto, provar o contrato, não perder mensagem

**Status:** Aceito
**Data:** 2026-10-27
**Decisores:** Lucas Azevedo
**Relacionados:** ADR-0009 (single-tenant), ADR-0010 (thread em JSONB), ADR-0012 (Vault + capability token), ADR-0017 (agente multicanal), `specs/006-evolution-confiavel/`; referência (somente leitura): repositório Atendimento `origin/main` `2a6d0ab7`, ADR-0033/0034/0037 de lá.

## Contexto

O E13-S12/S13 entregou o agente Evolution, mas **nunca foi provado contra uma Evolution real** (A-19)
e dependia de passos fora do produto (criar e parear a instância no painel da Evolution). Na análise
do TriviAtende (2026-10-27) apareceram falhas que o Akros também tinha ou herdaria: o webhook era
gravado com o campo errado (`webhookBase64`; o oficial é `base64`) **sem reler** (a Evolution responde
2xx sem aplicar); `@lid` sem telefone era descartado; imagem e documento eram descartados em
silêncio; telefone compartilhado vinculava ao cliente mais antigo (e o portal mostra ao cliente as
conversas vinculadas a ele); "reiniciar por logout" na 2.3.3 para o recebimento. O servidor Evolution
do Akros é **novo** e sua versão é desconhecida: o contrato observado no TriviAtende (2.3.3) é
hipótese.

## Decisão

1. **O produto conecta o número** (Configurações → Canal WhatsApp · Evolution): servidor →
   canal → instância + webhook → aceite de risco + QR → estado. Função admin nova `canal-evolution`
   (Auth admin, CSRF, rate limit fail-closed, Zod `.strict()`); `integracoes-ia-salvar` deixa de tocar
   em Evolution.
2. **Contrato provado, não suposto.** O servidor só aceita instâncias se a **versão** estiver na
   matriz `configuracoes.evolution_compatibilidade` com as 5 capacidades que se provam sem número
   pareado (criar instância, QR, estado, webhook com cabeçalho, eventos). A matriz é **dado**, editada
   pelo admin com evidência e auditoria; sem seed. O smoke `scripts/evolution-contract-smoke.ts`
   cria uma instância efêmera, prova e **apaga**. O **envio** só se prova com número pareado: vira
   condição para **ativar** o canal, provado pela mensagem de teste do próprio produto.
3. **Webhook gravado e relido.** `webhook/set` com `base64:false`, cabeçalho secreto
   `x-akros-webhook` (nunca `jwt_key`), 5 eventos; o canal só avança se `webhook/find` confirmar URL,
   cabeçalho, eventos e `base64`. O segredo vai ao Vault **antes** de a Evolution o conhecer e é
   conferido de novo depois (a Evolution não reenvia evento recusado com 401).
4. **Conectado = número esperado.** `fetchInstances.ownerJid` (a 2.3.x não traz owner em
   `connectionState`) comparado com o número do canal (nono dígito tolerado). Outro número nunca
   conecta e **não** se força logout.
5. **Nada individual some.** Anexo (imagem, documento, áudio, vídeo) é baixado, validado (tipo e
   15 MB) e guardado no bucket privado `comunicacao-anexos`; falha vira mensagem "anexo não baixado"
   com motivo. Figurinha/contato/localização viram aviso em texto. Remetente `@lid` sem telefone
   comprovado vira conversa **"contato não identificado"**, só da equipe, sem cliente e sem resposta
   (difere do TriviAtende, que descarta). O agente não interpreta anexo: envia o encaminhamento à
   equipe, no máximo uma vez a cada 10 minutos por conversa.
6. **Identidade sem palpite.** Telefone só de campo do próprio evento (`remoteJidAlt`, `senderPn`) ou
   de **um único** par no histórico da instância; conflito vira não identificado. O vínculo com
   cliente só ocorre com **exatamente um** cliente com o telefone (`crm.obter_cliente_unico_por_telefone`).
7. **Estado do canal só pelo servidor.** Gatilho `proteger_estado_canal` impede que `authenticated`
   (mesmo admin) altere `estado_conexao`, instância, aceite de risco ou `credenciais_configuradas`.
8. **Sem "reiniciar por logout".** A tela nunca oferece sair da sessão; em versão marcada como afetada
   explica que o remédio é reiniciar o servidor Evolution.
9. **Segredos:** chave global do servidor no Vault (`evolution-servidor:<id>`), segredo do webhook em
   `evolution:<conta>`; o banco guarda só os 4 últimos caracteres. A instância é acessada com a chave
   global (o `auth.guard` oficial a aceita em toda rota; na 2.3.3 do TriviAtende o envio só funcionou
   com ela). Trocar o **endereço** do servidor reinicia os canais; trocar só a chave, não.

## Alternativas consideradas

| Alternativa | Prós | Contras | Por que (não) escolhida |
|---|---|---|---|
| Portar a matriz 2.3.3 do TriviAtende | rápido | prova de outro servidor | rejeitada: o servidor do Akros é novo |
| Constante de código para a matriz | simples | troca de versão exige deploy | rejeitada: FR-004 |
| Exigir `sendText` para conectar | mais completo | só se prova pareado ⇒ circular | `sendText` condiciona **ativar** |
| Instância criada no painel da Evolution | menos código | passo manual, sem prova de webhook | rejeitada |
| Descartar `@lid` sem número (como TriviAtende) | simples | cliente escreve e some | rejeitada: decisão do dono |
| Chave por instância (token) nas chamadas | menor privilégio | falhou no envio da 2.3.3 | chave global; reavaliar após o smoke |

## Consequências

- (+) Primeira conexão com prova em cada passo; falha deixa o canal retomável e visível.
- (+) Perda silenciosa de mensagem deixa de existir (SC-009).
- (−) O envio por Evolution continua **síncrono dentro do webhook**: falha da Evolution perde a
  resposta (recibo `falhou`). Saída durável, saúde do canal e resposta humana = **E13-S16**.
- (−) Chave global do servidor é usada em runtime; vazamento exige trocá-la na tela.
- (−) Admin pode registrar uma versão como provada sem rodar o smoke (a evidência é texto livre).
  Aceito: admin é o dono da instalação; fica auditado.
- Reverso: migration `0039` (cabeçalho). Só reverter antes de haver conversa real.

## Fontes consultadas em 2026-10-27

- Evolution (fonte oficial, `main` 2.3.7): `event.dto.ts` (webhook `{enabled,url,headers,byEvents,base64,events}`),
  `webhook.controller.ts` (10 tentativas; 400/401/403/404/422 não reenviam; payload inclui `apikey`),
  `auth.guard.ts`, `sendMessage.dto.ts`, `instance.router.ts`.
- TriviAtende `origin/main` `2a6d0ab7`: `evolution-configurar`, `evolution-pareamento`,
  `evolution-webhook`, `packages/shared/atendimento/evento-evolution.ts`, runbook `EVOLUTION-PILOTO`.
