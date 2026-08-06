---
name: SPEC
description: Cenários de demo (presets que populam o app em estados específicos).
story: E05-S02
tier: pequeno
---

# SPEC — Cenários de Demo (E05-S02)

## User Story
Como **apresentador (time Akros)**, quero **carregar cenários prontos**, para que **eu mostre
rapidamente diferentes estados da plataforma na demo**.

## Contexto
Consome `useMockDb.seed` com seeds alternativos. Cada cenário popula personas/leads/jornadas num estado.

## Cenários mínimos
1. **Funil cheio** — leads em todas as 6 colunas do kanban.
2. **Cliente recém-contratado** — jornada na Introdução/Fase 1.
3. **Cliente no meio** — Fase 2/3, documentos e pagamentos parciais.
4. **Aguardando USCIS** — Fase 4 concluída, Fase 5 em acompanhamento.
5. **Caso aprovado** — jornada concluída, relocation.

## Acceptance Criteria

### AC-1: Selecionar cenário
```gherkin
Given  a barra de demo (E05-S01)
When   escolho um cenário
Then   o app re-semeia o mock db para aquele estado
And    personas/leads/jornadas refletem o cenário
```

### AC-2: Reset
```gherkin
Given  qualquer estado
When   clico "resetar demo"
Then   o app volta ao seed padrão
```

### AC-3: Cenários cobrem as frentes
```gherkin
Given  os cenários
When   carrego cada um
Then   consigo demonstrar site → lead → kanban → cliente → jornada → admin coerentemente
```

### AC-4: i18n + impeccable
```gherkin
Given  o seletor de cenário
When   troco idioma / avalio
Then   traduz; discreto; impeccable passa
```

## Out of Scope
- Persistência entre reloads (cenário é recarregável).

## Notas
- Seeds em `src/mocks/scenarios.ts`. Feature `demo`. Alinhado às personas de E00-S04.
