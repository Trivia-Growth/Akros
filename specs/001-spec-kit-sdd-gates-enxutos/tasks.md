# Tasks: Spec Kit como SDD e gates enxutos

**Story**: E00-S07 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Formato: `[ID] [US] descrição — gate`. Cada gate é um comando.

## Phase 1: Spec Kit

- [x] T-01 [US1] `specify init . --integration claude` e versionar `.specify/` e `speckit-*`
      — gate: `ls .claude/skills | grep -c speckit` = 10
- [x] T-02 [US1] Escrever `.specify/memory/constitution.md` v1.0.0 sem placeholders
      — gate: `grep -c '\[[A-Z_]\+\]' .specify/memory/constitution.md` = 0
- [x] T-03 [US1] Verificar numeração do script
      — gate: `.specify/scripts/bash/create-new-feature.sh --dry-run "x" --short-name x` → `002-x`

## Phase 2: Corte de gates

- [x] T-04 [US3,US4] Remover scripts e testes: audit-esteira, eval-spec-fidelity, check-gate-coverage,
      validate-mermaid, check-degraded-mode, check-story, nova-story, remind-impeccable, lib/spec-dirs;
      remover `_debt-baseline.json`; podar `package.json` (adiciona `e2e`)
      — gate: `pnpm run test:gates` verde com os scripts restantes
- [x] T-05 [US3] Reescrever `lefthook.yml` (pre-push = lint, typecheck, testes, gitleaks)
      — gate: `pnpm exec lefthook validate`
- [x] T-06 [US3] Reescrever `.github/workflows/ci.yml` em 3 jobs; `db-tests` idêntico
      — gate: `git diff origin/main -- .github/workflows/ci.yml` (job db-tests sem mudança de passos) e YAML válido
- [x] T-07 [US4] Podar `.claude/settings.json` (hook check-story, permissões) e skills `auditar`,
      `clarificar`, `nova-feature`, `validar`
      — gate: `grep -rn "check-story\|audit-esteira" .claude` sem resultado

## Phase 3: Documentação

- [x] T-08 [US4] Reescrever README, CLAUDE.md, AGENTS.md, Definition-of-Done.md, ANTI-PADROES.md,
      NOVO-PROJETO.md, core-config.yaml; ADR-0015 e ADR-0016; ROADMAP e STATE
      — gate: busca de referências mortas (AC US4-1) sem resultado

## Phase 4: Fora do repositório (@devops)

- [ ] T-09 Trocar **uma vez** os required checks da `main` pelo agregador `ci` (os 12 nomes antigos
      saem). Depois disso, mudar jobs da CI não exige mexer na proteção:
      ```bash
      gh api -X PATCH repos/Trivia-Growth/Akros/branches/main/protection/required_status_checks \
        -f strict=true -f 'contexts[]=ci'
      ```
      — gate: `gh api repos/Trivia-Growth/Akros/branches/main/protection/required_status_checks --jq .contexts` → `["ci"]`

## Phase 5: Verificação

- [x] T-10 [US5] `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm run arch:check
      && pnpm run lint:migrations && pnpm run check:edge-functions`
- [x] T-11 [US2] `git diff --stat origin/main -- 'specs/E*' specs/_examples` vazio
- [x] T-12 `/revisao-adversarial` sobre o corte — **CONCERNS** (2026-10-01), sem achado reproduzido.
      Tentativas: migration sem RLS/FORCE → `lint-migrations` vermelho; Edge Function pública sem
      `checarLimite` e fora do `config.toml` → `check-edge-functions` vermelho; `domain/` importando
      React → `arch:check` vermelho (`domain-nao-importa-framework`); baselines dos três verdes (exit 0);
      os 3 scripts mantidos têm teste próprio que roda dentro do comando do job.
      Concerns (não bloqueiam; viram story/ajuste se doerem):
      1. gitleaks local é best-effort (`skip` sem binário); só a CI bloqueia.
      2. Sessões paralelas rodando `/speckit-specify` recebem o mesmo número sequencial (ex.: duas
         `002-…`). Mitigação possível: `--timestamp` ou `--number` explícito.
      3. `prepare-hooks.test.mjs` só roda em `pnpm run test:gates`, que não está na CI.
      4. Pré-existente, fora do escopo: `CLAUDE.md` importa `@.claude/memory/feedback-*.md`, que não
         existem no repositório.
      5. Perda de cobertura de autorização pelo e2e sob demanda (ADR-0016): fechar com testes SQL de RLS.
