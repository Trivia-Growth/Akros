---
name: AGENTS
description: Quem produz/consome cada artefato SDD, autoridade de comando e mapa skill→agente Triviaiox. Puxe ao orquestrar o trabalho (Akros).
alwaysApply: false
---

# AGENTS.md — Agentes Triviaiox no Akros

O SDD roda no **GitHub Spec Kit** (ADR-0015); os agentes do **Triviaiox** (sem alterar o core dele)
são **papéis de trabalho** sobre esse fluxo, não etapas separadas dele. Há um único conjunto de
artefatos canônicos por feature, em `specs/NNN-<slug>/`.

## Artefato × comando spec-kit × papel

| Artefato | Comando | Papel que costuma conduzir | Quando |
|---|---|---|---|
| `spec.md` (o quê/por quê, AC Given/When/Then) | `/speckit-specify`, `/speckit-clarify` | `@pm` (com `@analyst`) | toda feature não-trivial |
| `plan.md` (+ `research.md`, `data-model.md`, `contracts/`) | `/speckit-plan` | `@architect` (`@data-engineer` para DDL/RLS) | toda feature não-trivial |
| `tasks.md` | `/speckit-tasks`, `/speckit-analyze` | `@sm` | toda feature não-trivial |
| código + testes | `/speckit-implement`, `/speckit-converge` | `@dev` | — |
| ADR (`docs/adr/`) | — | `@architect` | decisão difícil de reverter |
| migrations/DDL | — | `@data-engineer` | mudança de banco |

A **constituição** (`.specify/memory/constitution.md`) é a barra que o `/speckit-plan` confere.
As 91 specs anteriores (`specs/E0N-S0N-*/`) estão congeladas como referência.

## Fluxo canônico (ciclo de uma feature)
```
/speckit-specify → /speckit-clarify → /speckit-plan → /speckit-tasks → /speckit-analyze
  → /speckit-implement ⇄ /speckit-converge → /revisao-adversarial → @devops (PR)
```
Features de **IA/LLM** acrescentam `@prompt-engineer` (evals, versionamento de prompt, defesa
contra injection) e `@security`/`@qa` aplicam o **OWASP LLM Top 10** — ver `ia/`.

## Autoridade de comando (do Triviaiox — respeitar)
- **`@devops` — EXCLUSIVO:** `git push`, `git push --force`, `gh pr create/merge`,
  gestão de MCP, CI/CD, release. Todos os outros são **bloqueados** nestas operações.
- **`@dev`:** pode `git add/commit/status/branch/checkout/merge` **local**,
  `stash/diff/log`; **não** faz push nem mexe em AC/escopo/título da spec.
- **`@pm`:** requirements, escrita de spec, épicos.
- **`@po`:** validação de story-draft (checklist), priorização de backlog.
- **`@sm`:** criação de `tasks.md` a partir de spec/plan.
- **`@architect`:** decisões de arquitetura, seleção de tecnologia, ADR; delega DDL
  detalhado a `@data-engineer`.
- **`@data-engineer`:** schema, migrations, otimização de query, RLS.

## Skills do repositório
| Skill | Faz | Papel |
|---|---|---|
| `/speckit-*` | ciclo SDD (specify, clarify, plan, tasks, analyze, implement, converge, checklist) | `@pm` · `@architect` · `@sm` · `@dev` |
| `/revisao-adversarial` | tenta **quebrar** cada AC (borda, erro, concorrência, abuso) antes do PASS | `@qa` + `@security` |
| `/revisar-pr` | conformidade com a constituição e a spec no PR | `@qa` |
| `/handoff` | pausa/retoma via `docs/STATE.md` | qualquer |

## Quadro completo de agentes (15)
`@triviaiox-master` (orquestra), `@pm`, `@po`, `@sm`, `@analyst`, `@architect`,
`@data-engineer`, `@dev`, `@qa`, `@security`, `@reliability`, `@prompt-engineer`,
`@ux-design-expert`, `@devops`, `@squad-creator`.

## Agentes disponíveis neste repositório
- `.claude/commands/TRIVIAIOX/agents/` — para Claude Code
- `.codex/agents/` — para o Codex
- `.claude/skills/` — `speckit-*` (spec-kit), `revisao-adversarial`, `revisar-pr`, `handoff`, `impeccable`

## graphify

This project uses a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
