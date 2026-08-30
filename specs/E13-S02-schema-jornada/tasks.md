---
name: TASKS
description: Decomposição AC→task→gate de E13-S02.
story: E13-S02
alwaysApply: false
---

# tasks.md — E13-S02 Schema `jornada`

## Task 1 — Migration (AC-1, AC-4, AC-5)
`supabase/migrations/0003_E13-S02_schema_jornada.sql` — schema, 3 tabelas, FK em cascata,
`crm.meu_cliente_id()`, RLS + GRANT das 3 tabelas.

**Gate:** `pnpm run lint:migrations` verde.

## Task 2 — Aplicar + expor schema
`supabase db push`; adicionar `jornada` em `db_schema` (Management API, mesmo passo "achado" no
E13-S01); `GRANT USAGE/SELECT... TO service_role` se necessário pro seed (task 3).

**Gate:** `supabase migration list` confirma; seed (task 3) não dá 42501/PGRST106.

## Task 3 — Seed mínimo
1 jornada por cliente seed (Carlos, Renata), 1-2 fases e 1-2 etapas cada — não a jornada completa
de 6 fases, só o suficiente pra popular o teste de RLS.

**Gate:** `service_role` consegue inserir e ler de volta.

## Task 4 — Verificação de RLS via curl (AC-2, AC-3)
Mesmo padrão do E13-S01: login real, consultar as 3 tabelas com `Accept-Profile: jornada`.

**Gate:** Carlos só vê a própria jornada/fases/etapas; admin vê tudo.

Ao terminar: `/validar`, atualizar `docs/STATE.md` e `docs/epics/ROADMAP.md` (E13-S02: ⬜ → 🟩).
