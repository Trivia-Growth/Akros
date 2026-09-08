---
name: TASKS
description: Decomposição AC→task→gate de E15-S02.
story: E15-S02
alwaysApply: false
---

# tasks.md — E15-S02 Dieta do chunk de entrada

> **Status: implementada em 2026-09-06.** O veredito da avaliação (ver `design.md`) é que o
> objetivo da story já tinha sido atingido como efeito colateral de E13-S11/E15-S01 — o trabalho
> restante era formalizar e travar anti-regressão, o que estas tasks fazem.

## Task 1 — Regra `entrada-nao-puxa-mocks-nem-supabase` (AC-1, AC-2)
Regra `forbidden` em `.dependency-cruiser.cjs`: o esqueleto de entrada (main/App/router/rota/
sessao-service/layouts/bootstrap de sessão e i18n) não importa estaticamente `src/mocks/**`,
`**/infrastructure/Supabase*`, `app/di` nem `app/real-repositories`. Ver `design.md` para as
decisões de escopo do `from` (por que `shared/layout/` inteira ficou de fora, por exemplo).
Mais o teste do próprio gate em `scripts/arch-rules.test.mjs` — fixture com import proposital do
container a partir do entry afirmando saída não-zero.

**Gate:** `pnpm run arch:check` verde E teste novo verde E regra **não** disparando no estado
atual (rodado em 2026-09-06: sem violações, 234 módulos).

## Task 2 — Fechar a SPEC_DEVIATION de E15-S01 (AC-3)
Reescrever o cabeçalho de `apps/web/src/app/di.ts`: remover a marcação `SPEC_DEVIATION` (E15-S01,
AC-4) e substituir pela justificativa do desenho atual (container estático por design; consumidores
lazy; gate E15-S02 como anti-regressão). Atualizar as referências em
`specs/E15-S01-resiliencia-modulo/tasks.md` (divergências) e `evidence/chunks.md` ("o que ainda
está no chunk de entrada") para constar "fechada em E15-S02".

**Gate:** `grep -c SPEC_DEVIATION apps/web/src/app/di.ts` = 0; `pnpm exec biome check .` verde;
`pnpm test:gates` verde (nenhum gate dependia da marcação).
