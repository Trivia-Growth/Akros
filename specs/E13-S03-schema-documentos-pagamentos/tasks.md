---
name: TASKS
description: Decomposição AC→task→gate de E13-S03.
story: E13-S03
alwaysApply: false
---

# tasks.md — E13-S03 Schema `documentos` + `pagamentos`

## Task 1 — Migration (AC-1, AC-4)
Schema + tabelas + RLS + GRANT (`authenticated` e `service_role`, aprendido em E13-S01/S02 —
feito de uma vez, sem migration de correção depois).

**Gate:** `pnpm run lint:migrations` verde.

## Task 2 — Aplicar + expor + seed mínimo
`supabase db push`; adicionar `documentos`/`pagamentos` em `db_schema`; 1 documento + 1 pagamento
por cliente seed; 2 linhas em `dados_recebimento` (BRL/USD, valores fictícios).

**Gate:** seed sem 403/PGRST106.

## Task 3 — Verificação de RLS (AC-2, AC-3)
Curl com os dois tokens reais, nas 4 tabelas.

**Gate:** isolamento confirmado; `dados_recebimento` lido por ambos, editado só pelo admin.

Ao terminar: `/validar`, atualizar `docs/STATE.md`/`docs/epics/ROADMAP.md` (E13-S03: ⬜ → 🟩).
