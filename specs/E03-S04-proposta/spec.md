---
name: SPEC
description: Proposta comercial (criar/enviar).
story: E03-S04
tier: pequeno
alwaysApply: false
---

# SPEC — Proposta Comercial (E03-S04)

## User Story
Como **admin**, quero **criar e enviar uma proposta comercial a um lead/cliente**, para que **eu avance
a negociação**.

## Contexto
Consome `PropostaRepository` (mock). Ligada a um lead (estágio "Em Negociação") ou cliente. Status:
rascunho · enviada · aceita · recusada.

## Acceptance Criteria

### AC-1: Criar proposta
```gherkin
Given  um lead em negociação
When   crio uma proposta (escopo do serviço, tipo de visto, valor, condições/parcelamento)
Then   a proposta é salva como "rascunho" vinculada ao lead
```

### AC-2: Enviar (mock)
```gherkin
Given  uma proposta em rascunho
When   clico "enviar"
Then   o status muda para "enviada" e aparece no histórico do lead/cliente
And    vejo uma pré-visualização da proposta (layout premium, identidade Akros)
```

### AC-3: Aceite/recusa
```gherkin
Given  uma proposta enviada
When   marco como aceita
Then  status muda para "aceita" e o lead pode ser movido para "Fechado" (integra kanban)
```

### AC-4: i18n + moeda + impeccable
```gherkin
Given  a proposta
When   troco idioma
Then   valores formatam por locale; traduz; impeccable passa (documento apresentável)
```

## Out of Scope
- Assinatura da proposta pelo cliente (pode reusar E02-S04 no futuro). PDF real / e-mail real.

## Notas
- Preview da proposta deve parecer um documento comercial real (impeccable). Feature `crm`.
