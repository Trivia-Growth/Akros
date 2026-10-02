---
name: SPECS
description: Como as specs convivem em specs/: layout spec-kit para o que é novo, 91 specs E0N-S0N congeladas como referência.
---

# specs/ — Especificações

O SDD do Akros roda no **GitHub Spec Kit** (ADR-0015). Este diretório tem dois tipos de pasta.

## Specs novas — layout spec-kit

```
specs/NNN-<slug>/          # numeração sequencial gerada por /speckit-specify
├── spec.md                # o quê e por quê; Acceptance Scenarios em Given/When/Then
├── plan.md                # como; confere a constituição (.specify/memory/constitution.md)
├── tasks.md               # tasks por user story, cada uma com gate executável
└── research.md · data-model.md · contracts/   # quando o plano pedir
```

O ID da story (`E0N-S0N`, ver `docs/epics/ROADMAP.md`) vai no cabeçalho da `spec.md`; a linha da
story no ROADMAP aponta a pasta. Exemplo completo: `001-spec-kit-sdd-gates-enxutos/`.

Ciclo: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` →
`/speckit-analyze` → `/speckit-implement` ⇄ `/speckit-converge` → `/revisao-adversarial`.
Feature trivial (≤3 arquivos, sem decisão) dispensa o ciclo.

## Specs anteriores — congeladas

`E00-*` a `E16-*` (91 pastas, formato `product.md`/`spec.md`/`design.md`/`tasks.md`) e `_examples/`
são **referência histórica**. Não são reescritas em massa nem verificadas por gate; ROADMAP e ADRs
continuam linkando para elas. Se uma story antiga for retomada, a nova `spec.md` nasce no layout
spec-kit e aponta para a antiga. `quick/` guarda specs triviais de uma página.

## Referências

- `CLAUDE.md` — convenções gerais e processo por story
- `AGENTS.md` — papéis e autoridade de comando
- `ANTI-PADROES.md` — quando PARAR e perguntar
- `Definition-of-Done.md` — checklist com gates executáveis
- `docs/adr/0015-spec-kit-como-sdd.md` — por que e como
