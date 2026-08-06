---
name: PRODUCT
description: Por quê/para quem do scaffold do app.
story: E00-S01
alwaysApply: false
---

# PRODUCT — Scaffold do app (E00-S01)

## Por quê
Nada pode ser construído sem a base do projeto. Precisamos de um app React 19 + Vite + TS + Tailwind
rodando em localhost, com a estrutura de pastas DDD que os ADRs definem, para que todas as demais
stories tenham onde plugar.

## Para quem
Time de desenvolvimento (Claude/Codex + humano) que vai construir as três frentes. Indiretamente, o
time da Akros, que verá o resultado em localhost.

## Sucesso
- `pnpm dev` sobe o app em localhost sem erro.
- Estrutura de pastas de `ARCHITECTURE.md` existe.
- Página inicial placeholder renderiza com Tailwind ativo.
- `pnpm build` e `pnpm typecheck` passam.
