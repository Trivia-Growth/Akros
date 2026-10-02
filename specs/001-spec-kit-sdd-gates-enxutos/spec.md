# Feature Specification: Spec Kit como SDD e gates enxutos

**Story**: E00-S07
**Feature Branch**: `chore/E00-S07-spec-kit-sdd`
**Created**: 2026-10-01
**Status**: Draft
**Input**: "Incluir o spec-kit como SDD, depois diminuir a quantidade de gates para ter um
desenvolvimento mais ágil, mantendo a segurança e a qualidade já existentes. Não descarte as specs
já escritas."

Decisões já tomadas: ADR-0015 (Spec Kit como SDD) e ADR-0016 (gates enxutos). Esta spec é o
contrato de verificação dessas duas decisões; o raciocínio está nos ADRs e não é repetido aqui.

## User Scenarios & Testing

### User Story 1 - Abrir uma feature pelo Spec Kit (Priority: P1)

Quem vai construir uma feature roda `/speckit-specify` no Claude Code e obtém `specs/NNN-<slug>/`
com a spec no formato do Spec Kit, já sob a constituição do Akros.

**Why this priority**: é o ponto de entrada de todo trabalho novo; sem ele nada mais vale.

**Independent Test**: `ls .specify .claude/skills | grep speckit` e ler `.specify/memory/constitution.md`.

**Acceptance Scenarios**:

1. **Given** o repositório clonado, **When** se lista `.claude/skills/`, **Then** existem as skills
   `speckit-specify`, `-clarify`, `-plan`, `-tasks`, `-analyze`, `-implement`, `-converge`.
2. **Given** `.specify/memory/constitution.md`, **When** se procura por placeholders `[...]` de
   template, **Then** não há nenhum e a versão é `1.0.0`.
3. **Given** `.specify/scripts/bash/create-new-feature.sh --dry-run "x" --short-name x`, **When**
   executado na raiz, **Then** devolve `specs/002-x` (a pasta `001-…` desta story já existe).

---

### User Story 2 - Specs anteriores seguem intactas (Priority: P1)

As 91 specs existentes continuam legíveis, linkadas e sem alteração.

**Why this priority**: restrição explícita do pedido ("não descarte as specs já escritas").

**Independent Test**: `git diff --stat origin/main -- 'specs/E*' specs/_examples` não lista nada.

**Acceptance Scenarios**:

1. **Given** a branch, **When** se compara `specs/E*` e `specs/_examples` com `origin/main`,
   **Then** o diff é vazio.
2. **Given** o `docs/epics/ROADMAP.md`, **When** se segue qualquer link para `specs/E0N-S0N-*`,
   **Then** o arquivo existe.

---

### User Story 3 - Ciclo local e CI rápidos sem perder segurança (Priority: P1)

O pre-push roda só o que pega regressão de código em segundos, e a CI mantém todo gate de
segurança, banco e arquitetura em 3 jobs.

**Why this priority**: é o objetivo de agilidade do pedido, com a restrição de não regredir segurança.

**Independent Test**: ler `lefthook.yml` e `.github/workflows/ci.yml`; rodar os comandos dos jobs.

**Acceptance Scenarios**:

1. **Given** `lefthook.yml`, **When** se lista `pre-push`, **Then** há exatamente: lint, typecheck,
   testes e gitleaks (este com `skip` se o binário não existir).
2. **Given** `ci.yml`, **When** se lista os jobs, **Then** são `qualidade`, `seguranca` e `db-tests`.
3. **Given** o job `seguranca`, **When** se lê seus passos, **Then** contém gitleaks bloqueante,
   `lint:migrations` e `check:edge-functions`.
4. **Given** o job `qualidade`, **When** se lê seus passos, **Then** contém Biome, typecheck,
   `arch:check`, testes e build.
5. **Given** o job `db-tests`, **When** se compara com `origin/main`, **Then** é idêntico (migrations
   do zero + testes SQL + falha se não houver teste).

---

### User Story 4 - Nenhuma referência morta (Priority: P2)

Remover gates e skills não deixa comando, hook ou doc apontando para o que sumiu.

**Acceptance Scenarios**:

1. **Given** o repositório, **When** se busca `audit:esteira`, `eval:spec`, `nova-story`,
   `check-story`, `validate:mermaid`, `check:gate-coverage`, `check:degraded-mode`,
   `remind-impeccable`, `/nova-feature`, `/clarificar`, `/validar`, `/auditar` fora de `specs/E*`,
   `docs/adr/` e `docs/state-historico/`, **Then** não há ocorrência.
2. **Given** `.claude/settings.json`, **When** se lê os hooks, **Then** nenhum aponta para script removido.

---

### User Story 5 - Gates mantidos continuam verdes (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a branch, **When** rodam `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
   `pnpm run arch:check`, `pnpm run lint:migrations` e `pnpm run check:edge-functions`, **Then** todos
   passam.

### Edge Cases

- A proteção de branch da `main` exige 12 checks com nomes antigos; sem ajuste, o PR não é
  mergeável. Tratado em `tasks.md` (T-09), fora do repositório.
- Upgrade do Spec Kit pode sobrescrever templates; mudanças em `.specify/templates/` precisam ser
  revisadas no diff.
- Perda de cobertura: e2e sai do pre-push (ADR-0016); fica `pnpm e2e` sob demanda.

## Requirements

### Functional Requirements

- **FR-001**: O repositório MUST conter o Spec Kit (`.specify/`, skills `speckit-*`) versionado.
- **FR-002**: A constituição MUST refletir os princípios de `CLAUDE.md` sem placeholders.
- **FR-003**: Specs `specs/E*` e `specs/_examples` MUST permanecer byte a byte iguais.
- **FR-004**: O pre-push MUST conter apenas lint, typecheck, testes e gitleaks.
- **FR-005**: A CI MUST ter os jobs `qualidade`, `seguranca` e `db-tests`, preservando todo gate de
  segurança, banco e arquitetura existente.
- **FR-006**: Scripts e skills removidos MUST NOT ter referência viva.
- **FR-007**: `README.md`, `CLAUDE.md`, `AGENTS.md`, `Definition-of-Done.md` e `NOVO-PROJETO.md`
  MUST descrever o fluxo novo.

### Out of Scope (vinculante)

- Migrar ou reescrever qualquer spec existente.
- Corrigir achados de segurança da avaliação de 2026-10-01 (A-02, A-03…): viram stories próprias.
- Criar testes SQL de RLS (recomendado no ADR-0016, story própria).
- Alterar a proteção de branch no GitHub (ação do `@devops`, `tasks.md` T-09).
- Mudar código de `apps/web` ou `supabase/`.

## Success Criteria

- **SC-001**: `pnpm run ci:local` cai de 14 comandos para 4 e roda em segundos.
- **SC-002**: CI cai de 13 jobs para 3 sem remover gate de segurança.
- **SC-003**: Nenhum arquivo de spec legada foi alterado.
