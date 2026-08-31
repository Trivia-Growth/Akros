---
name: TASKS
description: Decomposição AC→task→gate de E13-S07.
story: E13-S07
alwaysApply: false
---

# tasks.md — E13-S07 Schema `lgpd`

## Task 1 — Migration (AC-1, AC-4)
2 tabelas, RLS, GRANT (`authenticated`+`service_role`), trigger de auditoria nas duas.

**Gate:** `pnpm run lint:migrations` verde.

## Task 2 — Aplicar + expor + seed mínimo
1 consentimento + 1 solicitação (`export`) por cliente seed.

**Gate:** seed sem 403/PGRST106.

## Task 3 — Verificação (AC-2, AC-3)
Curl com os dois tokens reais; `UPDATE` de status como cliente + releitura via `service_role`.

**Gate:** isolamento confirmado; `audit.eventos` ganha linha pras duas tabelas.

Ao terminar: `/validar`, atualizar `docs/STATE.md`/`docs/epics/ROADMAP.md` (E13-S07: ⬜ → 🟩).
