---
name: SPEC
description: Contrato técnico do schema crm.clientes + RLS por papel/cliente_id.
story: E13-S01
alwaysApply: false
---

# spec.md — E13-S01 Schema `crm.clientes` + RLS

## Acceptance Criteria

### AC-1 — Tabela existe com RLS FORCE
**Given** a migration aplicada no projeto `mhxopadkizktsenohnbm`
**When** consultado `pg_tables`/`pg_policies`
**Then** `crm.clientes` existe, `rowsecurity = true` e `forcerowsecurity = true`.

### AC-2 — Cliente autenticado só vê a própria linha
**Given** um usuário com `app_metadata.role = "cliente"` e uma linha em `crm.clientes` com
`auth_user_id` igual ao seu `auth.uid()`, mais outras linhas de outros clientes
**When** ele faz `SELECT * FROM crm.clientes` (via PostgREST, `Authorization: Bearer <seu token>`)
**Then** só a própria linha volta — nunca as de outros clientes, mesmo que existam.

### AC-3 — Admin vê todas as linhas
**Given** um usuário com `app_metadata.role = "admin"`
**When** ele faz o mesmo `SELECT`
**Then** todas as linhas voltam.

### AC-4 — Sem policy de INSERT/DELETE pra `authenticated`
**Given** qualquer usuário autenticado (cliente ou admin)
**When** ele tenta `INSERT`/`DELETE` via PostgREST
**Then** falha (RLS sem policy = sem acesso) — criação/remoção de cliente fica atrás de
`service_role` até E13-S07 decidir o caso de uso real.

### AC-5 — Migration segue a convenção e passa no lint
**Given** `supabase/migrations/0001_E13-S01_schema_clientes.sql`
**When** `pnpm run lint:migrations` roda
**Then** passa — toda `CREATE POLICY` tem `GRANT` correspondente na mesma migration (regra do
script, ver `scripts/lint-migrations.mjs`).

### AC-6 — Segundo usuário `cliente` seed existe
**Given** a decisão de produto de E12-S02 era "só 2 usuários" (admin + 1 cliente)
**When** este AC é implementado
**Then** um segundo usuário `cliente` é criado no Supabase Auth (persona `renata-alves`, já
existente em `mocks/personas.ts`) — decisão consciente, registrada aqui como ampliação explícita
do escopo de E12-S02 (não um `SPEC_DEVIATION` silencioso): sem um segundo cliente real não dá pra
provar isolamento de linha nenhum (AC-2 fica não-testável de verdade com 1 usuário só).

## Fora de escopo

Ver `design.md`.

## Gate

```
pnpm run lint:migrations
# aplicar a migration:
supabase db push
# verificação AC-1 a AC-4 via curl (ver design.md, seção Verificação) — sem Docker/pgTAP
```
