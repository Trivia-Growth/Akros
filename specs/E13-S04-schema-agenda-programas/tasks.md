---
name: TASKS
description: Decomposição AC→task→gate de E13-S04.
story: E13-S04
alwaysApply: false
---

# tasks.md — E13-S04 Schema `agenda` + `programas`

## Task 1 — Migration (AC-1, AC-4)
Schema + tabelas + RLS + GRANT (`authenticated` e `service_role`, desde o início).

**Gate:** `pnpm run lint:migrations` verde.

## Task 2 — Aplicar + expor + seed mínimo
`supabase db push`; adicionar `agenda`/`programas` em `db_schema`; 1 reunião por cliente seed;
1 linha em `programas.programas` (`eb2-niw`, catálogo global — mesma versão congelada do mock).

**Gate:** seed sem 403/PGRST106.

## Task 3 — Verificação de RLS (AC-2, AC-3)
Curl com os dois tokens reais. Pro `UPDATE` bloqueado, reler com `service_role` (lição do E13-S03
— 204 sozinho não prova nada).

**Gate:** isolamento de `agenda` confirmado; `programas` lido por ambos, editado só pelo admin.

Ao terminar: `/validar`, atualizar `docs/STATE.md`/`docs/epics/ROADMAP.md` (E13-S04: ⬜ → 🟩).
