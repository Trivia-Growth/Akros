---
name: TASKS
description: Decomposição AC→task→gate de E13-S05.
story: E13-S05
alwaysApply: false
---

# tasks.md — E13-S05 Schema `comunicacao`

## Task 1 — Migration (AC-1, AC-4)
5 tabelas, GRANT (`authenticated`+`service_role`) desde o início, RLS — 3 com policy de cliente,
2 admin-only (sem policy de cliente nenhuma).

**Gate:** `pnpm run lint:migrations` verde.

## Task 2 — Aplicar + expor + seed mínimo
1 conversa + 1 evento por cliente seed; 1 agente (`regras_atendimento_ia`) e 1 fonte de
conhecimento (dado global, não por cliente).

**Gate:** seed sem 403/PGRST106.

## Task 3 — Verificação de RLS (AC-2, AC-3)
Curl com os dois tokens reais nas 5 tabelas.

**Gate:** isolamento em `conversas`/`email_threads`/`eventos`; `[]` pra cliente em
`regras_atendimento_ia`/`fontes_conhecimento`, linhas reais pro admin.

Ao terminar: `/validar`, atualizar `docs/STATE.md`/`docs/epics/ROADMAP.md` (E13-S05: ⬜ → 🟩).
