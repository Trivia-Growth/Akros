---
name: SPEC
description: Contrato técnico do schema jornada (jornadas/fases/etapas) + RLS.
story: E13-S02
alwaysApply: false
---

# spec.md — E13-S02 Schema `jornada`

## Acceptance Criteria

### AC-1 — Três tabelas, RLS FORCE, FK em cascata
**Given** a migration aplicada
**When** consultado `pg_tables`/`pg_policies`
**Then** `jornada.jornadas`/`fases`/`etapas` existem, todas com `rowsecurity`/`forcerowsecurity`
`true`; `fases.jornada_id` e `etapas.fase_id` têm `ON DELETE CASCADE`.

### AC-2 — Cliente só vê a própria jornada (e fases/etapas dela)
**Given** duas jornadas seed (Carlos e Renata)
**When** Carlos consulta `jornada.jornadas`/`fases`/`etapas` via PostgREST
**Then** só as linhas ligadas à jornada dele voltam — nunca as de Renata.

### AC-3 — Admin vê todas as jornadas/fases/etapas
**Given** os mesmos dados seed
**When** o admin consulta as três tabelas
**Then** todas as linhas de ambos os clientes voltam.

### AC-4 — `crm.meu_cliente_id()` não vaza dado de outro cliente
**Given** a função helper criada
**When** chamada como Carlos
**Then** devolve o id do próprio Carlos (nunca o de Renata) — a RLS de `crm.clientes` já garante
isso, este AC só confirma que a função não usa `SECURITY DEFINER` nem contorna a policy.

### AC-5 — Migration passa no lint
**Given** `supabase/migrations/0003_E13-S02_schema_jornada.sql`
**When** `pnpm run lint:migrations` roda
**Then** passa (GRANT antes de cada POLICY).

## Gate

```
pnpm run lint:migrations
supabase db push
# verificação AC-2/AC-3 via curl (mesmo padrão do E13-S01/design.md), Accept-Profile: jornada
```
