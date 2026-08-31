---
name: TASKS
description: Decomposição AC→task→gate de E00-S06.
story: E00-S06
alwaysApply: false
---

# tasks.md — E00-S06 Invariantes do Padrão OS

> Ordem deliberada: os invariantes baratos e de alto retorno primeiro (1 e 3). O invariante 2 não
> tem task aqui — por decisão do `design.md`, ele vira critério de aceitação das stories de E13 em
> diante, não trabalho retroativo.

## Task 1 — Testes dos 8 scripts sem cobertura (AC-1)
`lint-migrations` e `check-story` primeiro (são os que decidem alguma coisa); depois os geradores.
Forma: `scripts/check-edge-functions.test.mjs`.

**Gate:** `node --test scripts/` verde, com ao menos um caso de saída não-zero por script.

## Task 2 — `check-gate-coverage.mjs` (AC-1)
Script que falha se um gate de `scripts/` não tem `.test.mjs` par. Tem teste próprio — senão ele
mesmo viola o invariante que verifica.

**Gate:** o próprio script, mais seu teste, verdes no `pre-push`.

## Task 3 — Guarda de "coleção vazia" nos gates que varrem (AC-2)
Aplicado em `eval-spec-fidelity` e `audit-esteira` em 2026-08-30. Falta auditar
`check-edge-functions`, `lint-migrations` e `validate-mermaid` pelo mesmo critério.

**Gate:** por script, um teste que monta coleção vazia e afirma saída não-zero.

## Task 4 — Regra `frente-nao-importa-frente` (AC-3)
Em `.dependency-cruiser.cjs`, mais o teste que prova que a regra falha com importação cruzada
proposital. Compartilhada com `specs/E15-S01-resiliencia-modulo/` task 5.

**Gate:** `pnpm run arch:check` verde; teste do gate verde.

## Task 5 — Teste de não-propagação entre frentes (AC-4)
É a task 2 de `specs/E15-S01-resiliencia-modulo/`. Não duplicar — referenciar.

**Gate:** `pnpm test` verde com o caso de não-propagação.

## Task 6 — `check-degraded-mode.mjs`, metade declaração (AC-5)
Só a checagem documental: integração no catálogo tem seção de modo degradado no `design.md` da
story que a introduziu. A exigência de teste fica suspensa até haver adapter real (ver `design.md`).

**Gate:** o script falha para uma integração sem a seção; teste próprio prova isso.
