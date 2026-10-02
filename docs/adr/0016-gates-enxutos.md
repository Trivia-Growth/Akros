---
name: adr-0016-gates-enxutos
description: Corta os gates de 13 jobs de CI e 14 comandos de pre-push para 3 jobs e 4 comandos, mantendo todo gate de segurança. Lista o que saiu, o que ficou e por quê.
alwaysApply: false
---

# ADR-0016 — Gates enxutos

**Status:** Aceito
**Data:** 2026-10-01
**Decisores:** Lucas Azevedo
**Relacionados:** ADR-0015 (Spec Kit), ADR-0011 (política que motivou vários gates),
`specs/001-spec-kit-sdd-gates-enxutos/`

## Contexto

A CI tinha 13 jobs (cada um reinstalando dependências) e o `pre-push` rodava 14 comandos mais o
e2e. Boa parte existia para policiar a esteira SDD própria (frontmatter, links, rastreabilidade
spec→task, mermaid, "todo script tem teste", modo degradado) — gates sobre documentos, não sobre o
produto. Com o Spec Kit (ADR-0015) esse formato deixa de ser nosso, e a maior parte desses gates
perde o objeto. O custo era ritmo: push lento, `main` protegida por 12 checks e cinco scripts que
só serviam a outros scripts.

Critério usado: **um gate fica se pega regressão de código, de segurança ou de banco que nenhum
outro pega.** Gate que policia formato de documento sai.

## Decisão

### Ficam (todos os de segurança, qualidade e banco)

| Gate | Onde | Por que fica |
|---|---|---|
| Biome | pre-commit, pre-push, CI | estilo e erros estáticos baratos |
| typecheck | pre-push, CI | contrato entre camadas |
| vitest (+ axe-core) | pre-push, CI | regressão e acessibilidade |
| `arch:check` | CI | regra de dependência `interfaces → application → domain ← infrastructure` |
| build | CI | o que vai a produção compila |
| gitleaks | CI (bloqueante), pre-push (se instalado) | segredo no histórico |
| `lint:migrations` (RLS FORCE, GRANT, reverso, Squawk) | CI | segurança de banco |
| `check:edge-functions` (rate limit, função órfã) | CI | segurança de perímetro; fecha SD-01 |
| `db-tests` | CI | migrations do zero + testes SQL |
| commitlint | commit-msg | rastreio por story no commit |
| e2e (Playwright) | `pnpm e2e`, sob demanda | único teste de autorização pela UI; obrigatório antes de mexer em auth/RLS/sessão |

### Saem

| Gate | Motivo |
|---|---|
| `audit:esteira` | policia frontmatter e links de docs/specs; o objeto some com o Spec Kit |
| `eval:spec` + `_debt-baseline.json` | exige o formato antigo de AC→task; mede dívida do passado |
| `check:gate-coverage` | meta-gate ("todo script tem teste"); com menos scripts, revisão de PR basta |
| `check:degraded-mode` | exigia declaração em specs antigas; a regra vira item de revisão do `plan.md` |
| `validate:mermaid` | diagrama que não renderiza aparece no review; custo de manter o gate > ganho |
| `remind-impeccable`, `check-story` | lembretes que nunca falhavam; a obrigação segue na DoD e na constituição |
| `nova-story` | substituído por `/speckit-specify` |

### Como a CI fica

Três jobs de gate: `qualidade` (Biome, typecheck, `arch:check`, testes, build), `seguranca` (gitleaks,
`lint:migrations`, `check:edge-functions`) e `db-tests`, mais o agregador `ci`, que depende dos três
e falha se qualquer um falhar ou for pulado. Um `pnpm install` por job em vez de 13.

**O agregador `ci` é o único check obrigatório na `main`.** Sem ele, cada criação, renomeação ou
remoção de job exigiria alterar a proteção de branch (ação manual do `@devops`, fácil de esquecer e
capaz de travar PR). Com ele, a lista de gates evolui só no `ci.yml`.

### e2e fora do pre-push

O e2e rodava em todo push (~13 s, com credencial local). Passa a `pnpm e2e` sob demanda. O risco é
real: uma regressão de autorização pode chegar à CI sem ninguém ter rodado a matriz. Mitigações:
(a) a DoD e a constituição tornam o `pnpm e2e` obrigatório quando o PR toca auth, RLS ou sessão;
(b) a cobertura de RLS deve migrar para `supabase/tests/*_test.sql`, que roda na CI sem credencial
(fora do escopo desta ADR; ver achado A-02 da avaliação de 2026-10-01).

## Consequências

- (+) `pre-push` cai de ~14 comandos para 4 em paralelo; CI de 13 jobs para 3.
- (+) Nenhum gate de segurança, de banco ou de arquitetura foi removido.
- (−) A proteção de branch precisa trocar os 12 nomes antigos por `ci` **uma vez, antes do merge**,
  senão o PR fica esperando checks que não existem mais (ação do `@devops`; comando em `tasks.md`
  T-09). Depois disso, mudar jobs não exige mexer na proteção.
- (−) Sem `audit:esteira`, link quebrado em doc só aparece em leitura. Aceito: doc não derruba produção.
- Reintroduzir um gate exige o teste do próprio gate e a saída de outro de custo equivalente
  (constituição, "Gates e fluxo").
