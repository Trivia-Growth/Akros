# Akros

Plataforma digital da Akros Immigration Solutions, desenvolvida com o **Padrão SO v3 + Triviaiox**
— desenvolvimento guiado por especificação, com gates executáveis.

> **Quer começar um projeto novo com este padrão?** Este README descreve o **Akros**.
> O guia de bootstrap é `docs/NOVO-PROJETO.md` — o que copiar, o que apagar e o que ainda não
> está pronto.

## Quick start

```bash
pnpm install          # instala deps E os git hooks (script `prepare` → lefthook)
pnpm dev              # sobe o app em http://localhost:5173
pnpm run ci:local     # espelho da CI — rode antes de todo push
```

Só isso. `pnpm install` já instala os hooks; não existe passo separado.

Para o e2e (Playwright), crie `apps/web/.env.test.local` com as credenciais dos usuários seed —
ver `specs/E12-S03-playwright-matriz-autorizacao/spec.md`. Sem ele, `pnpm --filter @akros/web
test:e2e` falha com mensagem explícita, não em silêncio.

## Onde está o quê

| Preciso de… | Leia |
|---|---|
| Regras que o agente segue em runtime | `CLAUDE.md` — **fonte de verdade** |
| O que **não** fazer / quando parar e perguntar | `ANTI-PADROES.md` |
| Quando uma feature está pronta | `Definition-of-Done.md` |
| Quem produz cada artefato | `AGENTS.md` |
| Princípios inegociáveis (barra do `/speckit-plan`) | `.specify/memory/constitution.md` |
| O que está sendo feito agora | `docs/STATE.md` |
| Épicos, stories e status | `docs/epics/ROADMAP.md` |
| Decisões difíceis de reverter | `docs/adr/` |
| Dívida de segurança aceita | `docs/SECURITY_DEBT.md` |
| Como reverter um deploy ou migration | `docs/runbook-rollback.md` |
| Como começar um projeto novo com este padrão | `docs/NOVO-PROJETO.md` |

## Ciclo de uma story (spec-kit)

O SDD roda no **[GitHub Spec Kit](https://github.com/github/spec-kit)** (ADR-0015). Os comandos
são skills do Claude Code, invocadas uma a uma no chat, com revisão humana entre elas:

```
/speckit-specify     → specs/NNN-<slug>/spec.md     (o quê e por quê, Given/When/Then)
/speckit-clarify     → afia ambiguidade antes de planejar (opcional, recomendado)
/speckit-plan        → plan.md + research/data-model/contracts (confere a constituição)
/speckit-tasks       → tasks.md                     (tasks por user story, com gate)
/speckit-analyze     → consistência spec × plan × tasks (opcional)
/speckit-implement   → implementa task a task
/speckit-converge    → repete implement→converge até "Converged"
/revisao-adversarial → tenta quebrar cada AC antes do PASS
@devops              → PR, merge, push                (ÚNICO com essa autoridade)
```

A constituição (`.specify/memory/constitution.md`) é a barra que o `/speckit-plan` confere:
segurança OS-grade, regra de dependência, spec como fonte da verdade, rastreabilidade por story.
Feature trivial (≤3 arquivos, sem decisão) dispensa o ciclo.

Antes de codar, marque o owner da story em `docs/epics/ROADMAP.md` — várias sessões trabalham em
paralelo neste repositório. O ID da story (`E0N-S0N`) vai no cabeçalho da `spec.md`, nos commits
(`feat(E0N-S0N): …`) e nas migrations. As 91 specs anteriores (`specs/E0N-S0N-*/`) ficam
**congeladas no lugar** como referência; não são reescritas nem verificadas por gate.

Setup do spec-kit em outra máquina: `uv tool install specify-cli` (o `.specify/` e as skills já
estão versionados; `specify init` só é preciso para atualizar a versão).

## Gates — o que a máquina verifica

Poucos, e todos pegam defeito real (ADR-0016). Gate novo só entra com o teste do próprio gate e a
saída de outro de custo equivalente.

**Local** — `pnpm run ci:local` (= `lefthook run pre-push`), em paralelo; hook e comando manual são
a **mesma** definição:

| Gate | Comando |
|---|---|
| lint | `pnpm exec biome check .` (no commit, só nos arquivos staged) |
| typecheck | `pnpm typecheck` |
| testes | `pnpm test` — regressão + acessibilidade (axe-core nos smoke tests) |
| segredos | `gitleaks` (só se instalado; na CI é bloqueante) |
| mensagem de commit | commitlint — Conventional Commits com o ID da story |

**CI** (`.github/workflows/ci.yml`, 3 jobs):

| Job | Conteúdo | O que impede |
|---|---|---|
| `qualidade` | Biome, typecheck, `pnpm run arch:check`, testes, build | regressão; `domain/` importando framework ou camada de fora; ciclo entre módulos |
| `seguranca` | gitleaks, `pnpm run lint:migrations`, `pnpm run check:edge-functions` | segredo no histórico; tabela sem **RLS FORCE**, `CREATE POLICY` sem `GRANT`, `DROP` sem reverso; Edge Function pública sem rate limit, função órfã |
| `db-tests` | migrations aplicadas do zero em Postgres 17 + `supabase/tests/*_test.sql` | migration que não aplica; regressão de RLS/RPC coberta por teste SQL |

**Sob demanda:** `pnpm e2e` (Playwright, matriz de autorização) abre browser real autenticando no
Supabase real. Roda só local — na CI custaria minutos em todo PR e abriria sessão em produção. É
obrigatório antes de mexer em auth, RLS ou sessão. Precisa de `apps/web/.env.test.local` e do
chromium (`pnpm --filter @akros/web exec playwright install chromium`).

Todo gate em `scripts/` tem `<nome>.test.mjs` ao lado provando que ele **falha** quando deve —
gate que nunca foi visto vermelho não é gate. `pnpm run test:gates` roda esses testes.

## Skills

| Skill | Uso | Agente |
|---|---|---|
| `/speckit-*` | ciclo SDD (specify, clarify, plan, tasks, analyze, implement, converge, checklist) | `@pm`, `@architect`, `@sm`, `@dev` |
| `/revisao-adversarial` | tenta **quebrar** cada AC antes do PASS | `@qa` + `@security` |
| `/revisar-pr` | conformidade com a constituição e a spec no PR | `@qa` |
| `/handoff` | pausa/retoma via `docs/STATE.md` | qualquer |
| `impeccable` | design de UI (carregada pela própria skill) | `@ux-design-expert` |

Os 15 agentes ficam em `.claude/commands/TRIVIAIOX/agents/` (Claude Code) e `.codex/agents/`
(Codex) e funcionam como papéis de trabalho. Autoridade de comando em `AGENTS.md` — resumo: só
`@devops` faz push, PR e merge.

## Estrutura

```
CLAUDE.md · AGENTS.md · ANTI-PADROES.md · Definition-of-Done.md   ← contrato do agente
docs/            PROJECT, ARCHITECTURE, glossary, STATE, SECURITY_DEBT,
                 runbook-rollback, adr/, epics/ROADMAP, state-historico/
specs/           NNN-<slug>/ (spec-kit: spec · plan · tasks) para o que é novo;
                 E0N-S0N-<nome>/ = 91 specs anteriores, congeladas; _examples/ = referência
.specify/        spec-kit: constituição (memory/), templates, scripts

apps/web/src/    features/<dominio>/{domain,application,infrastructure,interfaces}
                 shared/{ui,layout,lib,i18n,contracts}
supabase/        functions/{_template,_shared,sessao-*} · migrations/NNNN_E0N-S0N_*.sql
db/              README (convenções) · rls.template.sql
seguranca/       baseline-minimo · os-grade · threat-model.template
scripts/         gates + o teste de cada gate
.claude/         agents · skills · hooks · memory · settings.json
.triviaiox-core/ framework Triviaiox (versionado)
.github/         workflows/ci.yml · actions/setup
```

**Migrations vivem em `supabase/migrations/`** (convenção do Supabase CLI). `db/migrations/`
aparece no `db/README.md` como herança do template genérico e nunca existiu aqui.

## Arquitetura — a regra que a máquina verifica

```
interfaces → application → domain ← infrastructure
```

`domain/` é puro: não importa framework, I/O, nem outra camada. `pnpm run arch:check`
(dependency-cruiser) falha o build se alguém violar — não é convenção, é gate.

Features de domínios diferentes não se importam entre si; o que é comum vive em `shared/`.

## Segurança

Obrigatório em todo código: **RLS FORCE** em toda tabela (verificado por gate), `service_role`
nunca no client, secrets em Vault, input validado com Zod na borda, webhook com HMAC, erro sem
stack trace (RFC 7807, ver `apps/web/src/shared/lib/http/problem.ts`).

Checklists: `seguranca/baseline-minimo.md` (todo código) e `seguranca/os-grade.md` (PII,
financeiro, integração). Exceção aceita conscientemente vai para `docs/SECURITY_DEBT.md` — `P0`
aberto bloqueia produção.
