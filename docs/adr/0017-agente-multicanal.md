---
name: adr-0017-agente-multicanal
description: O agente de atendimento passa a ser um pipeline único com um adaptador por canal (Evolution v2, WhatsApp oficial e Instagram Direct da Meta); como identidade, segredos e recibo ficam.
alwaysApply: false
---

# ADR-0017 — Agente multicanal

**Status:** Aceito
**Data:** 2026-10-01
**Decisores:** Lucas Azevedo
**Relacionados:** ADR-0012 (Vault + capability token), ADR-0007 (agenda do agente sem gate),
`specs/003-agente-multicanal/`, projetos de referência `Atendimento` e `heziomos`

## Contexto

O E13-S12 entregou o agente só para Evolution, com o fluxo escrito dentro da própria Edge Function
(`evolution-webhook`). O pedido agora é o mesmo agente na API oficial do WhatsApp e no Direct do
Instagram. Copiar a function duas vezes duplicaria o trecho mais sensível (autenticar, deduplicar,
decidir encaminhar, chamar a IA, enviar, fechar o recibo) e faria cada correção de segurança ser
aplicada três vezes. A auditoria também achou a migration `0016` inaplicável e o formato v1 da
Evolution incompatível com a instância v2 (A-03, A-04, A-19).

## Decisão

1. **Pipeline único** em `_shared/agente.ts`, com dependências injetadas; **um adaptador por canal**
   em `_shared/canais/` (ler entrega autenticada, enviar texto). Canal novo = adaptador + function
   fina, sem tocar no pipeline.
2. **Identidade da conversa** = (conta de canal, contato externo). `contato_externo` é o telefone só
   com dígitos no WhatsApp e o id do remetente no Instagram. Unicidade por (conta, contato).
3. **Recibo genérico** `comunicacao.webhooks_canal`: deduplica pelo id do provedor por conta.
   Falha externa fecha o recibo como `falhou` e **não reenvia** (evita mensagem duplicada ao
   cliente, decisão herdada de E13-S12).
4. **Autenticação por canal, antes de parsear:** Evolution por token aleatório de 256 bits em
   cabeçalho (ADR-0012); Meta por HMAC SHA-256 do corpo bruto com o App Secret, comparado em tempo
   constante, mais o desafio `hub.verify_token` no GET. O corpo só é lido depois.
5. **Segredos só no Vault**, um item JSON por conta (`evolution:`, `meta-whatsapp:`,
   `meta-instagram:`) e por agente (`openrouter:`). Nada volta ao navegador. O token de verificação
   da Meta é escolhido pelo administrador e guardado cifrado; o servidor não o devolve.
6. **Formatos de provedor:** Evolution v2 (`{number, text}`; `webhook/set` com `{webhook:{…}}`),
   validados em produção no projeto Atendimento; Meta Graph API com a versão numa constante única
   (`_shared/canais/meta.ts`) com data de revisão, porque versão vencida degrada sem erro
   (lição registrada no heziomos).
7. **A `0016` é corrigida no lugar**, não substituída, porque nunca foi aplicada em ambiente algum.
   O shim de CI passa a declarar as assinaturas reais do Vault, para a CI parar de mentir.

## Consequências

- (+) Uma correção de segurança no pipeline vale para os três canais.
- (+) A CI passa a provar a migration contra as assinaturas reais do Vault.
- (−) Mudar o shim e a `0016` no lugar só é seguro enquanto a `0016` não for aplicada; depois do
  rollout, qualquer ajuste vira migration nova.
- (−) O token do WhatsApp/Instagram é colado na tela (sem OAuth da Meta): quem rotaciona é o
  administrador, a cada expiração, sem aviso automático. Fluxo OAuth fica para outra story.
- (−) Só texto; mídia, áudio e templates ficam fora.
- (−) O handoff só responde com a mensagem de encaminhamento; ninguém é notificado ainda.
