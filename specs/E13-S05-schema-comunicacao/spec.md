---
name: SPEC
description: Contrato técnico do schema comunicacao (conversas, e-mail, eventos, agente, base de conhecimento).
story: E13-S05
alwaysApply: false
---

# spec.md — E13-S05 Schema `comunicacao`

## Acceptance Criteria

### AC-1 — 5 tabelas, RLS FORCE
`conversas`, `email_threads`, `eventos`, `regras_atendimento_ia`, `fontes_conhecimento`.

### AC-2 — Isolamento por cliente em `conversas`/`email_threads`/`eventos`
Cliente só vê as próprias linhas; admin vê todas. Evento com `cliente_id NULL` (lead ainda não
convertido) não aparece pra nenhum cliente.

### AC-3 — `regras_atendimento_ia`/`fontes_conhecimento` são admin-only
Cliente autenticado recebe `[]` (não erro) nas duas; admin vê as linhas seed.

### AC-4 — Migration passa no lint
`pnpm run lint:migrations` verde.

## Gate

```
pnpm run lint:migrations
supabase db push
# verificação via curl (Accept-Profile: comunicacao) — inclui checar AC-3 com o token do Carlos
```
