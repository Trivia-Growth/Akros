---
name: SPEC
description: Contrato técnico de audit.eventos + trigger genérico nas 17 tabelas de negócio.
story: E13-S06
tier: arquitetural
alwaysApply: false
---

# spec.md — E13-S06 `audit.*` append-only

## Acceptance Criteria

### AC-1 — `audit.eventos` existe, RLS FORCE, admin-only
`rowsecurity`/`forcerowsecurity` true; cliente autenticado recebe `[]`; admin lê as linhas.

### AC-2 — Ninguém tem `UPDATE`/`DELETE`, nem `service_role`
`pg_catalog`/`information_schema` confirma: nenhum `GRANT UPDATE`/`DELETE` em `audit.eventos` pra
nenhum role. Tentativa de `UPDATE`/`DELETE` via PostgREST (mesmo com `service_role`) falha com
`42501` — não com RLS silenciosamente filtrando, com erro de privilégio mesmo.

### AC-3 — Mudança em qualquer uma das 17 tabelas gera evento
`INSERT`/`UPDATE`/`DELETE` em qualquer tabela de E13-S01..S05 grava uma linha em `audit.eventos`
com `tabela`, `operacao`, `dado_anterior`/`dado_novo` corretos.

### AC-4 — `SECURITY DEFINER` com `search_path` fixo
`audit.registrar_mudanca()` tem `SET search_path = audit, pg_temp` — sem isso a função fica
vulnerável a sequestro de `search_path` (CVE clássico de `SECURITY DEFINER`).

### AC-5 — Migration passa no lint
`pnpm run lint:migrations` verde.

## Gate

```
pnpm run lint:migrations
supabase db push
# verificação: UPDATE em crm.clientes via service_role, conferir audit.eventos ganhou 1 linha;
# tentar UPDATE em audit.eventos (qualquer role) e confirmar 42501, não 200/204.
```
