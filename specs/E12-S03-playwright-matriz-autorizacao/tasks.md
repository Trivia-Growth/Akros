---
name: TASKS
description: Decomposição AC→task→gate de E12-S03.
story: E12-S03
alwaysApply: false
---

# tasks.md — E12-S03 Playwright + matriz de autorização

## Task 1 — Instalar e configurar Playwright
`apps/web`: devDependency `@playwright/test`, `playwright.config.ts` — `webServer` sobe `pnpm dev`
na porta dedicada 4173 (`strictPort`, `reuseExistingServer: false`,
`env: { VITE_DEMO_MODE: "false" }`), `baseURL` = `http://localhost:4173`. Diretório de specs:
`apps/web/e2e/`.

> Corrigido em 2026-09-04: reutilizar 5173 aceitou um Vite de outro repositório e a matriz testou
> uma página `Not Found`. Colisão agora falha cedo em vez de produzir resultado falso.

**Gate:** `pnpm exec playwright install --with-deps chromium` roda sem erro.

## Task 2 — Matriz de autorização (AC-1 a AC-5)
`apps/web/e2e/auth-matrix.spec.ts`. Helpers de login/logout reaproveitados entre casos
(`page.goto("/login")`, preencher, submeter).

**Gate:** `pnpm exec playwright test` — 5 specs verdes.

## Task 3 — Linha fixme do E13 (AC-6)
Mesmo arquivo, `test.fixme("cliente A não vê dado de cliente B — aguarda E13 (RLS + segundo usuário
seed)", ...)`.

**Gate:** relatório do Playwright mostra 1 fixme, não conta como falha.

## Task 4 — Documentar execução local no pre-push
Comentário em `playwright.config.ts` e nota em `lefthook.yml`: Playwright roda no `pre-push`
local, usando credenciais gitignored, mas não na CI para não autenticar em produção por PR.

**Gate:** revisão — `pnpm run ci:local` chama Playwright; workflow CI não chama.
