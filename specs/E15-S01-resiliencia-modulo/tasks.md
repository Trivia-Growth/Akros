---
name: TASKS
description: Decomposição AC→task→gate de E15-S01.
story: E15-S01
alwaysApply: false
---

# tasks.md — E15-S01 Resiliência de módulo

> **Nada de código antes do `design.md` aprovado** (tier arquitetural, ver `CLAUDE.md`).
> Baseline medido em 2026-08-30: chunk único de 850,74 kB (gzip 236,92 kB), CSS 63,69 kB.

## Task 1 — `ErrorBoundary` por rota (AC-2, AC-3)
`shared/ui/ErrorBoundary.tsx` + montagem abaixo dos três shells. Fallback com nome da área, botão
**Tentar de novo** (remonta por troca de `key`) e link de volta. Sem stack na tela.

**Gate:** teste que monta um shell com filho que lança e afirma que (a) o shell continua no DOM e
(b) o botão de retry remonta a subárvore.

## Task 2 — Teste de não-propagação entre frentes (AC-1) — **o AC que fecha a story**
Teste que monta a árvore de rotas com um componente do admin que lança e afirma que o site
institucional continua renderizando. Sem este teste a story não fecha, por decisão explícita.

**Gate:** `pnpm test` verde com o novo caso.

## Task 3 — `React.lazy` por frente + split por rota no admin (AC-4)
Aplicar nos pontos de montagem das rotas; `Suspense` com `shared/ui/Skeleton.tsx`.

**Gate:** `pnpm run build` e comparação do manifesto de chunks contra o baseline acima — registrar
antes/depois em `evidence/chunks.md`.

## Task 4 — `carregarComRetry` no `import()` dinâmico (AC-5)
Envelope com 2 tentativas; ao esgotar, propaga para o boundary, cujo fallback passa a oferecer
recarregar a página.

**Gate:** teste unitário com `import` que falha na 1ª e resolve na 2ª; e outro que falha sempre e
chega ao fallback.

## Task 5 — Regra "frente não importa frente" (AC-6)
Nova regra `forbidden` em `.dependency-cruiser.cjs` entre `features/site`, as rotas do portal e as
do admin.

**Gate:** `pnpm run arch:check` verde; e um teste do próprio gate provando que ele **falha** com
uma importação cruzada de propósito (invariante 1 de `specs/E00-S06-invariantes-padrao-os/`).
