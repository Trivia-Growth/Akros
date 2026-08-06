---
name: adr-0003-estado-mock-zustand
description: Gerenciamento de estado do mock e da sessão de demo/impersonação.
alwaysApply: false
---

# ADR-0003 — Estado do mock e da sessão com Zustand

**Status:** Aceito
**Data:** 2026-08-06
**Decisores:** Trívia Studio
**Relacionados:** ADR-0002, spec E00-S04, E05-S01

## Contexto
Os repositories mock precisam de um "banco em memória" mutável (mover leads, marcar tarefas, liberar
fases) compartilhado entre telas. Também precisamos de estado de sessão de demo: persona ativa
(impersonação), visão atual (cliente/admin), cenário carregado.

## Decisão
Usar **Zustand** como store em memória:
- **`useMockDb`** — store que guarda o dataset mutável (leads, clientes, jornadas, conversas…),
  semeado a partir de `src/mocks/`. Os `Mock*Repository` leem/escrevem nele.
- **`useDemoSession`** — persona ativa, papel (cliente/admin), cenário carregado; usado pela
  impersonação (E05).
- Sem persistência entre reloads nesta fase (reset ao recarregar) — botão "resetar demo" reinicia
  o seed. Cenários (E05-S02) recarregam presets.

## Alternativas consideradas
| Alternativa | Prós | Contras | Por que (não) escolhida |
|---|---|---|---|
| Zustand (escolhida) | Simples, sem boilerplate, fora do React tree, seletores | Mais uma dep | Ideal p/ "db em memória" |
| React Context | Zero dep | Re-renders amplos, verboso p/ store grande | Ruim p/ dataset mutável |
| Redux Toolkit | Robusto | Boilerplate excessivo p/ protótipo | Overkill |

## Consequências
**Positivas:**
- Estado mutável simples e performático; fácil impersonar/trocar cenário.

**Negativas / trade-offs aceitos:**
- Estado some no reload (aceitável em protótipo; há "resetar demo" e cenários).
