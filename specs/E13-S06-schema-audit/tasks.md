---
name: TASKS
description: Decomposição AC→task→gate de E13-S06.
story: E13-S06
alwaysApply: false
---

# tasks.md — E13-S06 `audit.*` append-only

## Task 1 — Migration (AC-1, AC-2, AC-4, AC-5)
Schema `audit`, tabela `eventos`, função `registrar_mudanca()` (`SECURITY DEFINER`,
`search_path` fixo), RLS admin-only, `CREATE TRIGGER` nas 17 tabelas.

**Gate:** `pnpm run lint:migrations` verde.

## Task 2 — Aplicar
`supabase db push`; adicionar `audit` em `db_schema` (só pra permitir `SELECT` do admin via
PostgREST — a gravação é via trigger interno, não precisa de exposição pra isso).

**Gate:** `supabase migration list` confirma.

## Task 3 — Verificação (AC-2, AC-3)
`UPDATE` em `crm.clientes` via `service_role` → conferir `audit.eventos` ganhou linha com
`dado_anterior`/`dado_novo` corretos. Tentar `UPDATE`/`DELETE` em `audit.eventos` com
`service_role` → confirmar `42501` (falha de privilégio, não RLS silenciosa).

**Gate:** os dois comportamentos confirmados via curl direto no Postgres/PostgREST.

Ao terminar: `/validar`, atualizar `docs/STATE.md`/`docs/epics/ROADMAP.md` (E13-S06: ⬜ → 🟩).
