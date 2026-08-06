---
name: SPEC
description: Pagamentos do cliente (status, faturas, plano).
story: E02-S05
tier: pequeno
---

# SPEC — Pagamentos (E02-S05)

## User Story
Como **cliente**, quero **ver o status dos meus pagamentos**, para que **eu saiba o que já paguei e o
que está pendente**.

## Contexto
Consome `PagamentoRepository` (mock). Tipos: entrada (Fase 1), taxa federal USCIS (US$1.015, Fase 3),
parcelas/financiamento. Status: pendente · pago · atrasado.

## Acceptance Criteria

### AC-1: Lista de pagamentos com status
```gherkin
Given  /portal/pagamentos
When   acesso
Then   vejo os pagamentos do cliente (descrição, valor, moeda, vencimento, status)
And    totais/resumo (pago, pendente, próximo vencimento)
```

### AC-2: Detalhe de fatura
```gherkin
Given  um pagamento
When   clico
Then   vejo detalhes e (mock) opções de pagamento (cartão/conta) — sem processar de verdade
```

### AC-3: Estados por cenário
```gherkin
Given  personas diferentes
When   impersono
Then   os pagamentos refletem a fase da jornada (ex: entrada paga, taxa federal pendente)
```

### AC-4: i18n + moeda + impeccable
```gherkin
Given  a tela
When   troco idioma
Then   valores formatam por locale (R$/US$ via Intl); traduz; impeccable passa
```

## Out of Scope
- Gateway de pagamento real. Emissão fiscal.

## Notas
- Feature `pagamentos`. Formatação monetária com `Intl.NumberFormat`.
