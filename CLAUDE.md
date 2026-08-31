---
name: CLAUDE
description: Convenções agente para Akros (Padrão SO v3 + Triviaiox). Sempre ativo.
alwaysApply: true
---

# CLAUDE.md — Akros

> Projeto: **Akros** · Stack: **React 19 + Vite + TypeScript + Tailwind; Supabase (Postgres + Edge Functions)**
> Desenvolvido pela Trívia Studio seguindo o **Padrão SO v3** (SDD + Triviaiox).
> Idioma: **PT-BR com termos técnicos em inglês**.

Leia este arquivo antes de qualquer implementação. **É a fonte de verdade que o agente lê em
runtime**.

## Contexto do projeto
- **O que é:** Plataforma digital da **Akros Immigration Solutions** (consultoria de imigração EUA,
  foco EB-2 NIW). Três frentes: **site institucional** + **portal do cliente gamificado** +
  **painel admin**. Ver `docs/PROJECT.md`.
- **FASE ATUAL:** protótipo **visual** para demo ao cliente — **dados 100% mockados**, **sem login
  real**, **sem banco**, roda em **localhost**. Modo de **impersonação** para o time navegar como
  qualquer cliente/cenário. Arquitetura isola dados atrás de **portas/adapters** (mock agora,
  Supabase depois). Ver `docs/ARCHITECTURE.md`.
- **Módulos (bounded contexts):** `site`, `jornada`, `documentos`, `pagamentos`, `agenda`, `crm`,
  `comunicacao`, `demo`. Ver `docs/ARCHITECTURE.md`.
- **Idioma da plataforma:** bilíngue **PT-BR (default) + EN** via i18n. Nenhum texto hardcoded.
- **Identidade visual:** navy `#0D2240`, gold `#C6A254`, cream `#F5F4F0`. Logos em `Akros identidade/`.
  Toda UI segue a skill **impeccable** (`.claude/skills/impeccable/`).
- **Stack:** React 19 + Vite + TypeScript + Tailwind + React Router + react-i18next.
  (Supabase/Netlify apenas na fase futura — não agora.)
- **Papéis (mockados nesta fase):** visitante (site) · cliente (portal) · admin (backoffice).

## Regras aprendidas em sessões anteriores (leia sempre)

@.claude/memory/feedback-processo-stories.md
@.claude/memory/feedback-devops-branch-pr.md

## Início de sessão — contexto base obrigatório (`alwaysApply: true`)
Carregue **antes da primeira tarefa**:
este `CLAUDE.md` · `docs/STATE.md` · `docs/epics/ROADMAP.md` · `docs/PROJECT.md` · `spec.md` da feature ativa em `specs/`.

Todos os outros docs são `alwaysApply: false` — puxe **sob demanda** pelo `description` no frontmatter.

## Processo de trabalho por story (OBRIGATÓRIO — trabalho paralelo)
O desenvolvimento é feito por **múltiplas pessoas/sessões Claude simultaneamente**.
Cada sessão pode estar em um épico diferente. Para não haver conflito:

1. **Leia `docs/epics/ROADMAP.md` ao iniciar.** Veja qual story está disponível (sem owner).
2. **Marque o owner** da story nessa tabela antes de codar qualquer linha.
3. **Siga o ciclo de agentes Triviaiox** (`AGENTS.md`):
   - `@pm` / `@analyst` → define/refina o escopo da story e escreve `product.md`
   - `@architect` → (se tier arquitetural) escreve `design.md`
   - `@sm` → quebra em tasks (`tasks.md`) com referência de AC
   - `@dev` → implementa (somente após tasks.md existir)
   - `@qa` → valida ACs contra os gates
   - `@devops` → merge, commit, push
4. **Nunca implemente sem os artefatos que o tier exige** (ADR-0011). Se não existirem, crie-os primeiro.
5. **Ao concluir**, atualize `docs/epics/ROADMAP.md` (status, AC verdes) e `docs/STATE.md`.

## Convenções de nomeação — rastreio épico/story (OBRIGATÓRIO)

### Commits
Sempre incluir o ID da story no escopo do Conventional Commit:
```
feat(E01-S02): descrição do que foi feito
fix(E03-S01): descrição do fix
chore(E00-S00): descrição da tarefa de infra
```

> **O subject não pode começar com maiúscula** (`subject-case` do config-conventional). Isso pega
> sigla no início: `feat(E14-S01): RLS FORCE vira gate` é **rejeitado**. Comece por um verbo em
> minúscula e a sigla vem depois — `feat(E14-S01): exige RLS FORCE em toda tabela`.

### Migrations
Formato: `NNNN_E0N-S0N_descricao.sql`
- `NNNN` = sequência crescente (garante ordem de execução no Supabase)
- `E0N-S0N` = ID do épico + story que criou esta migration
- Exemplo: `0001_E01-S01_tabelas_base.sql`

A sequência nunca pula: se a última é `0001`, a próxima é `0002`.
Ver `db/README.md` para detalhes.

## A spec é a fonte da verdade
- Implemente **a partir de** `specs/NNNN-*/spec.md`. Os AC (Given/When/Then) são o contrato e
  o oráculo de teste.
- Spec ambígua? **Pare e pergunte.** Nunca adivinhe. Atualizar a spec é decisão consciente.
- **"Fora de escopo" é vinculante.**

## Verificação de conhecimento (nunca invente)
1. Padrões do próprio codebase.
2. Docs do projeto (`specs/`, `docs/`, ADRs, glossário).
3. MCP de referência (Supabase, Context7) quando conectado.
4. Web/doc oficial da tecnologia.
5. Não encontrou? **Diga "não sei" e sinalize.** Incerteza explícita > chute confiante.

## Antes de codar — descubra o tier
*Isso introduz decisão difícil de reverter ou nova fronteira de domínio?*

O `tier` é **declarado no frontmatter da `spec.md`** (`trivial` | `pequeno` | `arquitetural`) e
decide quais artefatos são obrigatórios — **ADR-0011**, verificado por `pnpm run eval:spec`:

| Tier | Quando | `spec.md` | `tasks.md` | `product.md` | `design.md` |
|---|---|---|---|---|---|
| **trivial** | ≤3 arquivos, sem decisão | opcional | não | não | não |
| **pequeno** | feature isolada | **sim** | **sim** | não | não |
| **arquitetural** | novo bounded context, integração externa, decisão irreversível, schema com dado em produção | **sim** | **sim** | **sim** | **sim** |

No tier arquitetural o `design.md` é aprovado **antes** de implementar. Sem ele → pare e sinalize.

`tasks.md` exige **rastreabilidade, não cardinalidade**: todo AC precisa ser citado por alguma
task, e uma task pode cobrir vários AC quando são a mesma mudança. Toda task continua tendo gate
executável.

Dívida herdada (stories fechadas antes desta regra) vive em `specs/_debt-baseline.json` e só
encolhe — nada é gerado retroativamente.

> Se os passos passarem de ~5 ou surgirem dependências complexas → crie `tasks.md` formal.
> Leia `ANTI-PADROES.md` antes de criar qualquer artefato.

## Quem faz o quê — agentes Triviaiox
`AGENTS.md` tem o ciclo completo. Resumo:
`@pm/@analyst` → `@architect` → `@sm` → `@dev` → `@qa` → `@devops` (único com git push/PR).
Feature com LLM → `@prompt-engineer` (ver `ia/`).

Agentes disponíveis: `.claude/commands/TRIVIAIOX/agents/` · `.codex/agents/`.

## Linguagem ubíqua
Use exatamente os termos de `docs/glossary.md` e do `domain.md` da feature. Termo novo → glossário
no mesmo PR. **Sem sinônimos.**

## Arquitetura — regra de dependência (DDD tático por feature)
```
interfaces → application → domain ← infrastructure
```
Dentro de `apps/web/src/features/<dominio>/`:
- `domain/` — sem I/O, sem framework.
- `application/` — casos de uso (orquestra domínio + portas).
- `infrastructure/` — adapters (Supabase, APIs externas…).
- Features de domínios diferentes **não se importam** — compartilhe via `packages/`.

## Segurança — OS-grade (obrigatório neste projeto)
RLS FORCE em toda tabela · schemas por domínio · `audit.*` append-only · secrets em Vault ·
refresh OAuth em Vault · webhooks com HMAC · `service_role` nunca no client.
Ver `seguranca/os-grade.md`. Toda dívida → `docs/SECURITY_DEBT.md`.

## Divergência da spec (SPEC_DEVIATION)
1. Pare. Marque `// SPEC_DEVIATION: <motivo>` no código e em `tasks.md`.
2. Decida: corrige o código OU atualiza a spec + ADR.
3. Nunca silencioso — spec e código divergentes = fonte da verdade apodrecendo.

## Definition of Done
`Definition-of-Done.md` (gates executáveis). Resumo:
- AC verdes **pelo comando** (não inspeção).
- `pnpm run ci:local` (= `lefthook run pre-push`, espelho da CI) verde; depois `gh pr checks` verde
  no PR, sem check obrigatório pulado.
- Sem `SPEC_DEVIATION` pendente · ADRs registrados · glossário e `docs/STATE.md` atualizados.

> **Gate verde não é "correto", é "o caminho feliz funciona".** Antes de dar PASS, faça a
> **revisão adversarial** (`/revisao-adversarial`): assuma que a feature está quebrada e tente
> prová-lo (borda, erro parcial, concorrência, buraco na spec, abuso). É a passada que pega o que
> o checklist confirmatório não vê — achado reproduzido vira teste e volta ao `@dev`.

## Mapa de documentos sob demanda
- **Identidade do projeto:** `docs/PROJECT.md`.
- **Arquitetura:** `docs/ARCHITECTURE.md` (bounded contexts, context-map, schemas).
- **Requirements por módulo:** `docs/blueprint/`.
- **Glossário:** `docs/glossary.md`.
- **Banco:** `db/README.md`, `db/rls.template.sql`.
- **Segurança:** `seguranca/baseline-minimo.md`, `seguranca/os-grade.md`.
- **Helpers de código:** `apps/web/src/lib/log.ts`, `apps/web/src/lib/http/problem.ts`.
- **Edge Functions:** `supabase/functions/_template/index.ts` + `_shared/`.
- **IA/LLM:** `ia/` (só em feature com LLM).
- **Exemplos SDD completos:** `specs/_examples/`.
- **Estado do trabalho:** `docs/STATE.md` (volátil; atualize ao pausar/retomar — use `/handoff`).
- **Decisões duráveis:** `docs/adr/` (nunca edite um ADR; crie um que o substitua).

## graphify

This project uses a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
