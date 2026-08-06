---
name: SPEC
description: Kanban de leads (6 colunas) com drag-drop.
story: E03-S01
tier: pequeno
alwaysApply: false
---

# SPEC — Kanban de Leads (E03-S01)

## User Story
Como **admin**, quero **gerenciar leads em um kanban**, para que **eu conduza o funil comercial**.

## Contexto
Consome `LeadRepository` (mock). Leads nascem do form da homepage (E01-S07) ou manuais. Estágios (ordem):
**Lead · Qualificado · Reunião Agendada · Em Negociação · Fechado · Descartado**.

## Acceptance Criteria

### AC-1: Board com 6 colunas
```gherkin
Given  /admin/leads
When   acesso
Then   vejo 6 colunas na ordem: Lead, Qualificado, Reunião Agendada, Em Negociação, Fechado, Descartado
And    cada lead é um card (nome, tipo de visto, origem, data, contato)
And    cada coluna mostra a contagem de leads
```

### AC-2: Mover lead (drag-drop)
```gherkin
Given  um lead numa coluna
When   arrasto para outra coluna
Then   o estágio do lead atualiza (LeadRepository.moverEstagio) e persiste na sessão
```

### AC-3: Detalhe/edição do lead
```gherkin
Given  um card de lead
When   clico
Then   vejo detalhes (dados, notas, histórico) e posso adicionar nota / editar
And    posso converter "Fechado" em Cliente (cria jornada — integra E02/E03-S03)
```

### AC-4: Lead novo do formulário aparece
```gherkin
Given  um lead criado pela homepage (E01-S07)
When   abro o kanban
Then   ele está na coluna "Lead"
```

### AC-5: i18n + impeccable + responsivo
```gherkin
Given  o kanban
When   troco idioma / avalio
Then   traduz; usável em telas menores; impeccable passa
```

## Out of Scope
- Automações de funil. Notificações reais.

## Notas
- Drag-drop acessível (teclado). Feature `crm`. Conversão Fechado→Cliente cria `Cliente` + `Jornada` (fase 0 liberada).
