---
name: SPEC
description: Agenda integrada (Gmail/Outlook) — visão admin, sincronização mockada.
story: E04-S03
tier: pequeno
alwaysApply: false
---

# SPEC — Agenda Integrada Gmail/Outlook (E04-S03)

## User Story
Como **admin/case manager**, quero **ver uma agenda integrada com Gmail/Outlook**, para que **eu
gerencie reuniões com clientes em um só lugar**.

## Contexto
Consome `AgendaRepository` (mock — ADR-0002). Visão do **lado admin** da agenda (o lado do cliente é
E02-S06). Simula sincronização com Gmail/Outlook e origem Calendly. Reuniões: kick-off, checkpoints,
consultas. Algumas geram transcrição (E04-S04).

## Acceptance Criteria

### AC-1: Visão de agenda (calendário)
```gherkin
Given  /admin/agenda (ou aba em comunicação)
When   acesso
Then   vejo um calendário (semana/mês) com as reuniões (título, cliente, horário, canal, status)
And    posso filtrar por case manager e por canal (gmail/outlook/calendly)
```

### AC-2: Status de conexão (mock)
```gherkin
Given  a área de agenda
When   olho o cabeçalho de integrações
Then   vejo o status "conectado" (mock) das contas Gmail e Outlook
And    um botão "sincronizar agora" que simula atualização (com feedback)
```

### AC-3: Detalhe da reunião
```gherkin
Given  uma reunião no calendário
When   clico
Then   vejo detalhes (cliente/lead vinculado, participantes, link, origem, transcrição se houver)
And    um atalho para a visão 360 do cliente (E03-S02)
```

### AC-4: Criar/reagendar (mock)
```gherkin
Given  a agenda
When   crio ou reagendo uma reunião
Then   ela aparece/atualiza no calendário (persistência em sessão)
And    reflete também na agenda do cliente (E02-S06) quando vinculada
```

### AC-5: i18n + fuso + impeccable
```gherkin
Given  a agenda
When   troco idioma
Then   datas/horas formatam por locale; traduz; impeccable passa
```

## Out of Scope
- OAuth real Gmail/Outlook. Sincronização real / .ics. Resolução de conflitos de calendário.

## Notas de implementação
- Reutiliza `AgendaRepository` compartilhado com E02-S06 (mesmo mock db). Feature `agenda`.
- Quando virar real: OAuth em Vault, refresh tokens seguros (ver `seguranca/os-grade.md`). Aqui é mock.
