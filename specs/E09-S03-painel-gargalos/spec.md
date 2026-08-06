---
name: SPEC
description: Painel de gargalos no admin — onde os casos param, por quanto tempo e de que lado.
story: E09-S03
tier: pequeno
alwaysApply: false
---

# SPEC — Painel de gargalos (E09-S03)

## User Story
Como **Akros**, quero **ver onde os casos empacam**, para que **eu ataque a causa em vez de
apagar incêndio caso a caso**.

## Contexto
A contrapartida operacional do E09-S01. Com responsável por etapa e tempo parado, dá para
responder duas perguntas que hoje ninguém responde com dado: **em que etapa os clientes travam** e
**de que lado está a demora, no agregado**.

## Acceptance Criteria

### AC-1: Ranking de etapas por tempo parado
```gherkin
Given  a base de casos ativos
When   acesso o painel de gargalos
Then   vejo as etapas ordenadas por tempo médio parado
And    para cada uma, quantos casos estão parados ali agora
And    o responsável predominante daquela etapa
```

### AC-2: Divisão de tempo por lado
```gherkin
Given  o conjunto de casos ativos
When   olho a divisão de responsabilidade
Then   vejo qual fração do tempo total está com o cliente, com a Akros, com terceiros e com a USCIS
And    consigo filtrar por programa e por case manager
```

### AC-3: Lista acionável, não só número
```gherkin
Given  um gargalo no ranking
When   clico nele
Then   vejo os clientes parados naquela etapa, com tempo parado e último contato
And    consigo abrir a visão 360 de cada um a partir dali
```

### AC-4: Comparação entre programas
```gherkin
Given  dois programas ativos
When   comparo
Then   vejo se o gargalo é do processo ou do programa específico
```

### AC-5: dataviz respeitada
```gherkin
Given  os gráficos do painel
When   avalio contra a skill dataviz
Then   magnitude usa hue sequencial única; nenhum gráfico tem eixo duplo
And    identidade nunca depende só de cor; existe visão em tabela
And    a paleta passou pelo validador antes do merge
```

### AC-6: i18n + impeccable
```gherkin
Given  o painel
When   troco idioma / avalio design
Then   traduz; números seguem formatação por locale; impeccable passa
```

## Out of Scope
- Alerta ativo (E09-S04).
- Metas e SLA por etapa — precisa de decisão da Akros sobre o que é aceitável.

## Notas de implementação
- Seção nova no dashboard admin (E03-S05) ou rota própria — decidir na task, sem duplicar KPI.
- **Rodar `scripts/validate_palette.js` da skill dataviz antes do merge.** AC-5 é verificável por
  comando, não por opinião.
