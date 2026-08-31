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
| O que está sendo feito agora | `docs/STATE.md` |
| Épicos, stories e status | `docs/epics/ROADMAP.md` |
| Decisões difíceis de reverter | `docs/adr/` |
| Dívida de segurança aceita | `docs/SECURITY_DEBT.md` |
| Como reverter um deploy ou migration | `docs/runbook-rollback.md` |
| Como começar um projeto novo com este padrão | `docs/NOVO-PROJETO.md` |

## Ciclo de uma story

```
@pm/@analyst → product.md + spec.md      (AC em Given/When/Then, "fora de escopo" vinculante)
@architect   → design.md + ADR           (só em tier arquitetural)
@sm          → tasks.md                  (cada task cobre um AC e tem gate executável)
@dev         → implementa                (1 commit por task, git local apenas)
@qa          → /validar + /revisao-adversarial
@devops      → PR, merge, push           (ÚNICO com essa autoridade)
```

Antes de codar, marque o owner da story em `docs/epics/ROADMAP.md` — várias sessões trabalham em
paralelo neste repositório.

Story nova: `pnpm run nova-story` (interativo — registra no ROADMAP e cria `specs/E0N-S0N-<nome>/`).

## Gates — o que a máquina verifica

`pnpm run ci:local` (= `lefthook run pre-push`) roda tudo em paralelo. Hook e comando manual são
a **mesma** definição, então não podem divergir.

| Gate | Comando | O que impede |
|---|---|---|
| esteira | `pnpm run audit:esteira` | frontmatter, link quebrado, caminho `docs/*.md` ou `pnpm run` citado que não existe, feature sem `spec.md` |
| fidelidade | `pnpm run eval:spec` | AC sem task; dívida herdada fica nomeada em `specs/_debt-baseline.json` e só encolhe |
| migrations | `pnpm run lint:migrations` | `DROP` sem reverso, `CREATE POLICY` sem `GRANT`, tabela sem **RLS FORCE**, prefixo numérico duplicado |
| edge-functions | `pnpm run check:edge-functions` | função órfã, `invoke` de função que não existe |
| arquitetura | `pnpm run arch:check` | `domain/` importando framework ou camada de fora; ciclo entre módulos |
| lint / typecheck / build | `pnpm lint`, `pnpm typecheck`, `pnpm build` | — |
| testes | `pnpm test` | regressão + acessibilidade (axe-core em toda tela de smoke test) |
| mermaid | `node scripts/validate-mermaid.mjs` | diagrama que não renderiza |

Todo gate em `scripts/` tem `<nome>.test.mjs` ao lado provando que ele **falha** quando deve —
gate que nunca foi visto vermelho não é gate (ver `specs/E00-S06-invariantes-padrao-os/`).
Rode `pnpm run test:gates` para verificar os gates em si (30 testes hoje). Ainda sem teste:
`check-story`, `validate-mermaid`, `nova-story`, `prepare-hooks`, `remind-impeccable`.

O `pre-push` roda ainda o **e2e** (Playwright, matriz de autorização): browser real autenticando
contra o Supabase real, ~13s. Ele roda **só aqui, nunca na CI** — lá custaria minutos em todo push
e abriria sessão em produção a cada PR. Precisa de `apps/web/.env.test.local` e do chromium
instalado (`pnpm --filter @akros/web exec playwright install chromium`).

Na CI (`.github/workflows/ci.yml`), um job por gate, mais dois que só existem lá: `gitleaks`
bloqueante e `db-tests` (migrations aplicadas do zero em Postgres limpo).

## Skills

| Skill | Uso | Agente |
|---|---|---|
| `/nova-feature` | abre feature: tier → spec → tasks | `@sm` + `@dev` |
| `/clarificar` | entrevista para afiar spec ambígua | `@pm` |
| `/validar` | roda os gates e checa a DoD | `@qa` |
| `/revisao-adversarial` | tenta **quebrar** cada AC antes do PASS | `@qa` + `@security` |
| `/revisar-pr` | conformidade SDD no PR | `@qa` |
| `/auditar` | integridade da esteira | `@architect` |
| `/handoff` | pausa/retoma via `docs/STATE.md` | qualquer |
| `impeccable` | design de UI (carregada pela própria skill) | `@ux-design-expert` |

Os 15 agentes ficam em `.claude/commands/TRIVIAIOX/agents/` (Claude Code) e `.codex/agents/`
(Codex). Autoridade de comando em `AGENTS.md` — resumo: só `@devops` faz push, PR e merge.

## Estrutura

```
CLAUDE.md · AGENTS.md · ANTI-PADROES.md · Definition-of-Done.md   ← contrato do agente
docs/            PROJECT, ARCHITECTURE, glossary, STATE, SECURITY_DEBT,
                 runbook-rollback, adr/, epics/ROADMAP, state-historico/
specs/           E0N-S0N-<nome>/ com product · design · spec · tasks (+ evidence/)
                 _examples/ = referência completa · _debt-baseline.json = dívida nomeada
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
