---
name: TASKS
description: Decomposição AC→task→gate de E12-S03.
story: E12-S03
alwaysApply: false
---

# tasks.md — E12-S03 Playwright + matriz de autorização

## Task 1 — Instalar e configurar Playwright
`apps/web`: devDependency `@playwright/test`, `playwright.config.ts` — `webServer` reaproveita
`pnpm dev` na porta 5173 (`reuseExistingServer: true`, `env: { VITE_DEMO_MODE: "false" }`),
`baseURL` = `http://localhost:5173`. Diretório de specs: `apps/web/e2e/`.

**Gate:** `pnpm exec playwright install --with-deps chromium` roda sem erro.

## Task 2 — Matriz de autorização (AC-1 a AC-5)
`apps/web/e2e/auth-matrix.spec.ts`. Helpers de login/logout reaproveitados entre casos
(`page.goto("/login")`, preencher, submeter).

**Gate:** `pnpm exec playwright test` — 5 specs verdes.

## Task 3 — Linha fixme do E13 (AC-6)
Mesmo arquivo, `test.fixme("cliente A não vê dado de cliente B — aguarda E13 (RLS + segundo usuário
seed)", ...)`.

**Gate:** relatório do Playwright mostra 1 fixme, não conta como falha.

## Task 4 — Documentar que e2e não entra no pre-push
Comentário em `playwright.config.ts` e nota em `lefthook.yml` (não mexe no arquivo, só confirma
que `pnpm exec playwright test` não está listado em `pre-push` — mesma categoria de `db-tests`
com Docker, que também fica de fora por depender de infra externa).

**Gate:** revisão — `pnpm run ci:local` continua sem chamar Playwright.
