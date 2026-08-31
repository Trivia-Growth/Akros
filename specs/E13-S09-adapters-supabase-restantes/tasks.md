---
name: TASKS
description: Decomposição AC→task→gate de E13-S09.
story: E13-S09
alwaysApply: false
---

# tasks.md — E13-S09 Sair do mock: os 4 contextos restantes

> Uma story-filha por contexto, como em E13-S01..S05 — cada passo reversível sozinho.

## Task 1 — `crm.leads` + adapter (AC-1)
Schema com RLS (lead é admin-only: não loga), adapter e `criarAPartirDeLead` real.
Destrava as 6 telas presas desde E13-S08.

**Gate:** `lint:migrations` verde; teste de conversão lead→cliente gravando em `crm.clientes`.

## Task 2 — `jornada` (AC-2, AC-6)
`DashboardPage`, `JornadaPage`, `OperacaoPage`. Auditar hook após early return em cada uma.

**Gate:** `pnpm test` + navegação real fora do modo demo.

## Task 3 — `documentos` (AC-2, AC-6)
Depende da task 2 (requisito de documento é por fase).

**Gate:** idem.

## Task 4 — `pagamentos` (AC-2, AC-6)

**Gate:** idem.

## Task 5 — `comunicacao` (AC-2, AC-6)
Maior volume: threads em JSONB.

**Gate:** idem.

## Task 6 — Store fictícia fora do ar (AC-3)
`useMockDb` deixa de ser inicializada quando `isDemoMode = false`. Não é filtro — é não carregar.

**Gate:** teste montando a app com `VITE_DEMO_MODE=false` e afirmando store vazia.

## Task 7 — Deletar o mapa de id (AC-4)
Remover `MAPA_ID_REAL_PARA_MOCK` e a `SPEC_DEVIATION`. Se algo quebrar ao remover, é porque um
contexto não migrou — o mapa é o detector.

**Gate:** `pnpm run eval:spec` mostrando um `SPEC_DEVIATION` a menos; suíte verde.

## Task 8 — Isolamento provado pela aplicação (AC-5)
Novo caso no `e2e/auth-matrix.spec.ts`: cliente A navega o portal e não vê nada de B. Substitui a
verificação por `curl` no PostgREST por uma pelo caminho real.

**Gate:** `pnpm --filter @akros/web exec playwright test` verde (roda no `pre-push`).
