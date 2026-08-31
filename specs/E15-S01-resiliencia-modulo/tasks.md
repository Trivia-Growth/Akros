---
name: TASKS
description: Decomposição AC→task→gate de E15-S01.
story: E15-S01
alwaysApply: false
---

# tasks.md — E15-S01 Resiliência de módulo

> **Status: implementada em 2026-08-31.** Todas as tasks com gate verde. Evidência de chunk
> antes/depois em `evidence/chunks.md`. Baseline: chunk único de 850,74 kB → entrada de
> 596,25 kB em 68 chunks.

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


---

## Resultado (2026-08-31)

| Task | Gate | Resultado |
|---|---|---|
| 1 — `ErrorBoundary` por rota | `pnpm test` | ✅ `src/app/resiliencia.test.tsx`, AC-2 e AC-3 |
| 2 — não-propagação entre frentes | `pnpm test` | ✅ AC-1 — **o teste que fecha a story** |
| 3 — `React.lazy` + split | `pnpm build` | ✅ 68 chunks, entrada 30% menor (`evidence/chunks.md`) |
| 4 — `carregarComRetry` | `pnpm test` | ✅ `carregar-com-retry.test.ts` (4) + 2 casos de rota |
| 5 — regra de arquitetura | `pnpm run arch:check` | ✅ 2 regras novas + `scripts/arch-rules.test.mjs` (6) |

**Divergências registradas, não silenciadas:**
- `SPEC_DEVIATION` em `app/di.ts` — a camada de dado (mocks + `supabase-js`) continua no chunk de
  entrada. Separar exigiria container assíncrono; fora do escopo de contenção de falha.
- AC-6 refinado de "frente não importa frente" para "site não se mistura com o resto", com o
  motivo escrito na `spec.md`.

**Achados de brinde:**
- `tsPreCompilationDeps` estava desligado: o gate de arquitetura era cego para `import type`.
  Ligado, +51 dependências passaram a ser analisadas, código real continuou limpo.
- `@testing-library/jest-dom` era devDependency desde E00-S01 e nunca tinha sido registrado.
  Registrado em `src/shared/lib/test-setup.ts`.
