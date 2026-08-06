---
name: SPEC
description: Inbox WhatsApp (oficial + Evolution) mockado, anexado ao cliente.
story: E04-S01
tier: pequeno
alwaysApply: false
---

# SPEC — Inbox WhatsApp (E04-S01)

## User Story
Como **admin**, quero **ver e responder conversas de WhatsApp num inbox**, para que **eu centralize a
comunicação com leads/clientes** — com histórico anexado à visão 360.

## Contexto
Consome `ConversaRepository` (mock). Canais: **WhatsApp Business API oficial** e **Evolution API**.
Mensagens de: cliente, agente IA (E04-S02), humano. UI realista (parece um WhatsApp Web).

## Acceptance Criteria

### AC-1: Lista de conversas
```gherkin
Given  /admin/comunicacao
When   acesso
Then   vejo a lista de conversas (contato, última mensagem, canal, não-lidas, horário)
And    posso filtrar por canal (oficial/Evolution) e por lida/não-lida
```

### AC-2: Thread de mensagens
```gherkin
Given  uma conversa
When   abro
Then   vejo o histórico de mensagens estilo chat (autor, texto, horário, status)
And    vejo qual canal e se houve atendimento por agente IA
```

### AC-3: Responder (mock)
```gherkin
Given  uma conversa aberta
When   escrevo e envio uma mensagem
Then   ela aparece na thread como "humano" (persistência em sessão)
```

### AC-4: Anexado ao cliente (360)
```gherkin
Given  uma conversa de um cliente
When   abro a visão 360 do cliente (E03-S02)
Then   a conversa aparece na aba Conversas
```

### AC-5: i18n + impeccable
```gherkin
Given  o inbox
When   troco idioma / avalio
Then   traduz; UI convincente; impeccable passa
```

## Out of Scope
- Envio real via WhatsApp/Evolution. Webhooks. Mídia real.

## Notas
- Mock realista é requisito da demo. Feature `comunicacao`.
