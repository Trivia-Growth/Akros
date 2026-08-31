---
name: SPEC
description: Contrato técnico dos schemas documentos + pagamentos.
story: E13-S03
tier: arquitetural
alwaysApply: false
---

# spec.md — E13-S03 Schema `documentos` + `pagamentos`

## Acceptance Criteria

### AC-1 — Tabelas com RLS FORCE
`documentos.documentos`, `documentos.solicitacoes_assinatura`, `pagamentos.pagamentos`,
`pagamentos.dados_recebimento` — todas com `rowsecurity`/`forcerowsecurity` true.

### AC-2 — Isolamento por cliente em `documentos` e `pagamentos`
Cliente só vê os próprios documentos/pagamentos via PostgREST; admin vê todos.

### AC-3 — `dados_recebimento` é lido por qualquer autenticado, escrito só por admin
Cliente consegue `SELECT`; `UPDATE` como cliente **não muda a linha** (PostgREST devolve 204
mesmo quando RLS filtra todas as linhas do `UPDATE` — 204 sozinho não prova nada, a verificação
precisa reler a linha com `service_role` e confirmar que o valor não mudou); `UPDATE` como admin
funciona e a mudança é visível na releitura.

### AC-4 — Migration passa no lint
`pnpm run lint:migrations` verde.

## Gate

```
pnpm run lint:migrations
supabase db push
# verificação via curl (Accept-Profile: documentos / pagamentos)
```
