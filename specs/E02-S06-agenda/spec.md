---
name: SPEC
description: Agendamento de reuniões (mock Calendly/Gmail/Outlook).
story: E02-S06
tier: pequeno
---

# SPEC — Agendamento de Reuniões (E02-S06)

## User Story
Como **cliente**, quero **agendar e consultar reuniões com a Akros**, para que **eu marque kick-off,
checkpoints e tire dúvidas**.

## Contexto
Consome `AgendaRepository` (mock). Reuniões: kick-off, checkpoint I/II, complementares. Canais mock:
calendly/gmail/outlook. Algumas reuniões têm transcrição (Fireflies — E04-S04).

## Acceptance Criteria

### AC-1: Lista/calendário de reuniões
```gherkin
Given  /portal/agenda
When   acesso
Then   vejo reuniões futuras e passadas (título, data/hora, canal, status)
```

### AC-2: Agendar (mock)
```gherkin
Given  slots disponíveis (mock)
When   escolho um horário e confirmo
Then   uma reunião é criada e aparece na lista (persistência em sessão)
And    vejo confirmação
```

### AC-3: Detalhe + transcrição
```gherkin
Given  uma reunião passada com transcrição
When   abro
Then   vejo detalhes e link/preview da transcrição (evidência) quando houver
```

### AC-4: i18n + fuso/impeccable
```gherkin
Given  a agenda
When   troco idioma
Then   datas/horas formatam por locale; traduz; impeccable passa
```

## Out of Scope
- Integração real Calendly/Gmail/Outlook. Convites .ics reais.

## Notas
- Feature `agenda`. Slots mock. Link de agendamento real da Akros pode ser exibido como referência.
