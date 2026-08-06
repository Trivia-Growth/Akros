# Akros

Projeto desenvolvido com **Padrão SO v3 + Triviaiox** — framework de desenvolvimento guiado por especificação (Story-Driven Development).

## Quick Start

1. **Clone e instale:**
   ```bash
   cd Akros
   pnpm install
   pnpm run prepare-hooks  # Instala git hooks (lefthook)
   ```

2. **Configure o projeto** (preencha placeholders em):
   - `docs/PROJECT.md` — identidade, stack, stakeholders
   - `docs/ARCHITECTURE.md` — bounded contexts, schemas
   - `docs/glossary.md` — termos de domínio

3. **Crie a primeira story:**
   ```bash
   pnpm run nova-story
   ```
   Isso cria `specs/E0N-S0N-<nome>/` com `spec.md` e `tasks.md`.

4. **Siga o fluxo SDD:**
   - `@pm` escreve `product.md` + `spec.md` (AC testáveis)
   - `@architect` escreve `design.md` (se tier arquitetural) + ADR
   - `@sm` escreve `tasks.md` (AC → task → gate executável)
   - `@dev` implementa (1 commit por task, local git)
   - `@qa` valida (roda gates, revisão adversarial)
   - `@devops` faz PR, merge, push

## Documentação Essencial

- **`CLAUDE.md`** — convenções do agente (leia primeiro!)
- **`AGENTS.md`** — quem faz o quê no ciclo SDD
- **`Definition-of-Done.md`** — gates que confirmam feature pronta
- **`ANTI-PADROES.md`** — quando PARAR e perguntar
- **`docs/PROJECT.md`** — (A PREENCHER) identidade do projeto
- **`docs/ARCHITECTURE.md`** — (A PREENCHER) arquitetura, bounded contexts
- **`docs/glossary.md`** — (A PREENCHER) linguagem ubíqua
- **`specs/README.md`** — como escrever specs (SDD)
- **`db/README.md`** — migrations, RLS, schema

## Stack Técnica

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Edge Functions)
- **Hospedagem:** Netlify (frontend), Supabase (backend)
- **Agentes:** Claude Code + Triviaiox framework
- **Qualidade:** Biome (lint/format), pgTAP (DB tests), TypeScript typecheck, git hooks (Lefthook)

## Estrutura do Repositório

```
Akros/
├── CLAUDE.md                    # Convenções de agente (obrigatório)
├── AGENTS.md                    # Autoridade de comando
├── Definition-of-Done.md        # Gates de qualidade
├── ANTI-PADROES.md             # Stop-conditions
├── docs/
│   ├── PROJECT.md              # (A PREENCHER) identidade
│   ├── ARCHITECTURE.md         # (A PREENCHER) bounded contexts, schemas
│   ├── glossary.md             # (A PREENCHER) linguagem ubíqua
│   ├── STATE.md                # Estado volátil (atualize ao pausar)
│   ├── adr/                    # Decision records (durável)
│   └── epics/ROADMAP.md        # Épicos e stories
├── specs/
│   ├── README.md               # Como escrever specs (SDD)
│   ├── _examples/0001-*/       # Exemplo completo (referência)
│   ├── quick/                  # Specs triviais (1-file)
│   └── NNNN-<nome>/            # Cada feature: product.md, spec.md, design.md, tasks.md
├── db/
│   ├── README.md               # Migrations, RLS, schema patterns
│   ├── rls.template.sql        # Template de RLS policies
│   └── migrations/             # SQL migrations (NNNN_E0N-S0N_*.sql)
├── apps/web/
│   └── src/
│       ├── lib/                # Shared helpers (log, http/problem, supabase-client)
│       └── features/<dominio>/ # DDD tático: domain/ + application/ + infrastructure/
├── supabase/functions/
│   ├── _template/              # Template de Edge Function (copia este)
│   └── _shared/                # Helpers compartilhados (auth, cors, crypto)
├── seguranca/
│   ├── baseline-minimo.md      # Checklist mínimo de segurança
│   ├── os-grade.md             # OS-grade security (multi-domain)
│   └── threat-model.template.md # Threat modeling template
├── .claude/
│   ├── commands/TRIVIAIOX/agents/ # 15 agentes (Morgan, Dex, Aria, River, Quinn, etc)
│   ├── skills/                     # 6 skills (nova-feature, validar, auditar, etc)
│   ├── hooks/                      # Git hooks (enforce-git-push-authority)
│   ├── memory/                     # Session memories (cross-session learnings)
│   └── settings.json               # Permissões e hooks do Claude Code
├── .codex/agents/              # Mesmo agentes pra modo Codex
├── .triviaiox-core/            # Framework Triviaiox (completo, git-tracked)
├── scripts/                    # Automation: audit-esteira, check-story, eval-spec, etc
├── lefthook.yml                # Git hooks (pre-commit, pre-push, etc)
├── biome.json                  # Linter + formatter
├── turbo.json                  # Monorepo build orchestration
├── .squawk.toml                # PostgreSQL migration linter
├── tsconfig.json               # TypeScript config
└── pnpm-workspace.yaml         # Monorepo workspace
```

## Como começar (Passo a Passo)

### 1. Preencher Contexto do Projeto

Edite `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, `docs/glossary.md` com informações específicas de Akros (cliente, domínios, termos de negócio).

### 2. Setup do Banco

```bash
# Criar banco inicial com Supabase
supabase init
supabase link
supabase db pull  # Sincronizar schema se já tiver banco

# Ou criar primeira migration
cat > db/migrations/0001_E00-S00_setup.sql << 'EOF'
-- Descricao: Setup inicial de tabelas base
-- Story: E00-S00

BEGIN;

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own row"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

COMMIT;
EOF

supabase db push
```

### 3. Criar Primeira Feature

```bash
pnpm run nova-story
# Responde às perguntas, cria specs/NNNN-<nome>/
```

### 4. Escrever Spec → Tasks → Implementar

1. **@pm:** Escreve `product.md` + `spec.md` (ACs Given/When/Then)
2. **@architect:** Escreve `design.md` (se necessário) + ADR
3. **@sm:** Quebra em `tasks.md` (AC → T-N, cada task tem gate)
4. **@dev:** Implementa (1 commit por task), roda gates localmente
5. **@qa:** Valida (roda gates de verdade, adversarial review)
6. **@devops:** PR + merge + push

### 5. Verificação Automática

```bash
# Local (espelho da CI)
pnpm run ci:local

# Coverage de AC
pnpm run eval:spec-fidelity

# Pipeline audit
pnpm run audit:esteira

# Edge Functions check
pnpm run check:edge-functions
```

## Agentes Disponíveis

Sistema Triviaiox oferece 15 agentes:

| Agent | Nome | Papel |
|-------|------|-------|
| `@pm` | Morgan | Product Manager — escreve product.md, spec.md, épicos |
| `@analyst` | Atlas | Business Analyst — market research, brainstorm |
| `@architect` | Aria | Architect — design.md, ADR, decisões de sistema |
| `@sm` | River | Scrum Master — tasks.md, gates, story readiness |
| `@dev` | Dex | Developer — implementa, local git |
| `@qa` | Quinn | QA — valida gates, adversarial review, security |
| `@security` | Cipher | Security Engineer — threat modeling, OWASP |
| `@data-engineer` | Dara | Database Architect — schema, migrations, RLS |
| `@devops` | Gage | DevOps — git push, PR, CI/CD, release |
| `@prompt-engineer` | Pria | Prompt Engineer — LLM evals, versionamento |
| `@reliability` | Rex | Reliability Engineer — observabilidade, runbooks |
| `@ux-designer` | Uma | UX/UI Designer — design system |
| `@po` | Pax | Product Owner — backlog priorização, story validation |
| `@squad-creator` | Craft | Squad Creator — assembla multi-agent teams |
| `@triviaiox-master` | Orion | TRIVIAIOX Orchestrator — framework meta, sync |

## Skills (Automações SDD)

| Skill | Comando | Uso |
|-------|---------|-----|
| nova-feature | `/nova-feature` | Criar nova feature (interage com specs/) |
| clarificar | `/clarificar` | Entrevista pra afiar spec ambígua |
| validar | `/validar` | UAT local (roda gates, checa DoD) |
| revisao-adversarial | `/revisao-adversarial` | Tenta quebrar AC antes do PASS |
| revisar-pr | `/revisar-pr` | PR review gate (conformidade SDD) |
| auditar | `/auditar` | Audit de integridade (frontmatter, links) |
| handoff | `/handoff` | Pausa/retoma via docs/STATE.md |

## Security (Obrigatório)

- RLS FORCE em toda tabela
- `service_role` nunca no client
- Secrets em Vault (Supabase), não em .env.local
- Input validado com Zod na borda
- Webhooks com HMAC
- Sem stack trace em erro (RFC 7807 problem+json)

Ver `seguranca/baseline-minimo.md`.

## Referências

- **Framework:** https://github.com/anthropics/triviaiox (core, agents, tasks)
- **Exemplos:** `specs/_examples/` (leia como template)
- **Mentor:** Use `/clarificar` quando spec ambígua; use `/auditar` antes de release
- **Debugging:** Ver `.claude/memory/` pra aprender de sessões anteriores

---

**Pronto?** Preencha os placeholders, crie primeira story com `pnpm run nova-story`, e comece!
