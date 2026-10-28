---
name: NOVO-PROJETO
description: Como iniciar um projeto novo com o Padrão SO v3 — o que copiar, o que apagar, o que preencher e o que ainda é manual. Puxe ao fazer bootstrap de um repositório novo.
alwaysApply: false
---

# Iniciar um projeto novo com o Padrão SO v3

Guia de bootstrap. Escrito em 2026-08-31 a partir do estado real do Akros — **não é aspiracional**:
o que ainda não funciona está marcado como tal, na seção "Lacunas conhecidas".

## Antes: este padrão serve para o quê?

Ele entrega **um contrato que a máquina verifica**, não um conjunto de boas intenções:

- Toda feature nasce de uma `spec.md` com AC em Given/When/Then, e todo AC é coberto por task.
- A regra de dependência (`interfaces → application → domain ← infrastructure`) é verificada por
  ferramenta, não por revisão.
- Toda tabela tem RLS FORCE, toda policy tem GRANT, todo DROP tem reverso documentado — por gate.
- Toda tela renderizada passa por checagem de acessibilidade.
- Todo gate tem um teste provando que ele **falha** quando deve.
- Só um papel (`@devops`) faz push, PR e merge.

**Não serve** para protótipo descartável de um fim de semana. A cerimônia custa; ela paga quando
o projeto vai durar, tem mais de uma pessoa/sessão trabalhando em paralelo, ou toca dado real.
Para o caso pequeno, o próprio `ANTI-PADROES.md` manda fazer menos.

## Passo 1 — Copiar a base

Não existe repositório-template publicado ainda (ver "Lacunas"). O bootstrap hoje é copiar deste
repositório. A tabela abaixo é a divisão exata.

### Copiar como está — é o framework

```
CLAUDE.md  AGENTS.md  ANTI-PADROES.md  Definition-of-Done.md
lefthook.yml  biome.json  turbo.json  tsconfig.json  pnpm-workspace.yaml
commitlint.config.cjs  .dependency-cruiser.cjs  .squawk.toml  .gitleaks.toml  .gitignore
.github/                       workflows/ci.yml + actions/setup
scripts/                       todos os gates + o .test.mjs de cada um + lib/
.claude/                       commands/TRIVIAIOX/agents/ · skills/ · hooks/ · settings.json
.codex/agents/
.triviaiox-core/
seguranca/                     baseline-minimo · os-grade · threat-model.template
db/                            README.md · rls.template.sql
supabase/functions/_template/  molde de Edge Function
specs/README.md  specs/INDEX.md  specs/_examples/
docs/adr/0000-template.md
docs/runbook-rollback.md       ajustar os comandos ao provedor de deploy do projeto novo
docs/state-historico/INDEX.md
```

### Copiar e esvaziar — a forma serve, o conteúdo não

| Arquivo | O que fazer |
|---|---|
| `docs/PROJECT.md` | reescrever: o que é o produto, para quem, stakeholders |
| `docs/ARCHITECTURE.md` | reescrever: bounded contexts e context map do domínio novo |
| `docs/glossary.md` | esvaziar — linguagem ubíqua é do domínio, nunca se reaproveita |
| `docs/epics/ROADMAP.md` | manter só cabeçalho, legenda e a coluna Owner |
| `docs/STATE.md` | zerar, deixando só a seção `## Agora` (formato em `.claude/skills/handoff/`) |
| `docs/SECURITY_DEBT.md` | zerar itens, manter cabeçalho, legenda P0/P1/P2 e a seção "Como usar" |

### Não copiar — é do Akros

```
apps/web/                      o app inteiro
specs/E00-*  …  specs/E16-*    todas as stories
specs/_debt-baseline.json      dívida herdada deste repositório
docs/adr/0001-*  …  0010-*     decisões deste produto
docs/state-historico/*.md      histórico de sessão
netlify.toml                   contém o ref do projeto Supabase do Akros (hardcoded)
supabase/migrations/           schema do Akros
supabase/functions/sessao-*    reaproveite SÓ se adotar o ADR-0008 (ver passo 4)
Akros identidade/  .impeccable/  manual-cliente-*.html  graphify-out/
```

## Passo 2 — Trocar o que é identidade

```bash
pnpm install                    # instala deps e os git hooks (script `prepare`)
```

Depois, arquivo por arquivo:

1. `package.json` (raiz): `name`, `description`.
2. `CLAUDE.md`: seção "Contexto do projeto" inteira — é o que o agente lê em runtime. Nome do
   produto, fase atual, módulos/bounded contexts, idioma, identidade visual, papéis.
3. `commitlint.config.cjs`: confira se a regra de escopo aceita o formato de ID de story
   (`E0N-S0N`) — ela é o que amarra commit à story.
4. `.dependency-cruiser.cjs`: os caminhos apontam para `apps/web/src/features/`. Se a estrutura de
   pastas do projeto novo for outra, ajuste **antes** da primeira feature, não depois.

## Passo 3 — Verificar que a esteira está viva

Este é o passo que costuma ser pulado e é o mais importante.

```bash
pnpm run ci:local
```

Verde na primeira execução, num repositório recém-copiado, **é suspeito** — um gate que não tem
nada para avaliar reporta sucesso por engano. Confirme que ele sabe reclamar:

```bash
pnpm run test:gates           # todo gate tem teste provando que FALHA quando deve
```

Se algum gate de `scripts/` não tiver `.test.mjs` ao lado, ele é uma promessa, não um gate. Foi
exatamente assim que dois gates deste repositório ficaram meses verdes avaliando **zero** itens.

## Passo 4 — Decidir o perfil de segurança

Antes da primeira feature, decida e registre em ADR:

- **Autenticação.** Reaproveitar o ADR-0008 do Akros (access token em memória + refresh em cookie
  `HttpOnly` via Edge Function + proxy first-party) ou outro desenho? Se reaproveitar, copie
  `supabase/functions/sessao-*` e **troque o ref do projeto Supabase** em `netlify.toml` e no
  `vite.config.ts` — os dois têm a URL hardcoded.
- **Multi-tenant?** Decidir agora. Adicionar `org_id` depois que existe dado é migração cara. O
  ADR-0009 do Akros registra a decisão contrária, com o raciocínio.
- **Perfil:** `seguranca/baseline-minimo.md` sempre; `os-grade.md` se houver PII, dinheiro ou
  integração de terceiro.

## Passo 5 — Primeira story

```bash
pnpm run nova-story
```

Registra no ROADMAP e cria `specs/E0N-S0N-<nome>/` com `spec.md` e `tasks.md`. Depois, o ciclo do
`AGENTS.md`: `@pm` escreve os AC, `@architect` só entra em tier arquitetural, `@sm` quebra em tasks
com gate, `@dev` implementa, `@qa` roda `/validar` e `/revisao-adversarial`, `@devops` faz o push.

Regra que não se dobra: **task só está feita quando o gate dela passa por comando**. Inspeção
visual não fecha task (`ANTI-PADROES.md`).

## Lacunas conhecidas do bootstrap

Honestidade sobre o estado de hoje. Nenhuma impede começar; todas custam tempo manual.

1. **Não há repositório-template nem script de bootstrap.** O passo 1 é copiar e apagar à mão.
   O que resolveria: extrair este repositório para um template com `degit`, ou um
   `scripts/novo-projeto.mjs` que copia a lista acima e esvazia o resto.
2. **`specs/_templates/` não existe.** O `nova-story.mjs` tem um molde embutido de fallback e
   funciona sem ele — mas o molde embutido escreve AC como "Dado/Quando/Então", enquanto a
   `Definition-of-Done.md` exige **Given/When/Then**, que é o formato de todas as specs reais.
   Corrija o molde ou crie `specs/_templates/spec.template.md` antes da primeira story, senão o
   desvio nasce na story 1.
3. **`supabase/functions/_shared/auth.ts` tem resíduo de outro projeto.** A documentação de
   `requireServiceRole` cita funções `pcm-auvo-*` e a spec `E01-S09-integracao-auvo-fundacao`,
   que não existem aqui. O código está correto; o comentário mente. Limpe ao copiar.
4. **`db/README.md` documenta `db/migrations/`, que nunca existiu.** As migrations reais vivem em
   `supabase/migrations/`. Corrija o README ao copiar, ou o projeto novo herda a confusão.
5. **Deploy preview, CSP e sink de erro ainda não fazem parte da base.** Estão especificados em
   `specs/E16-S01-operacao-deploy/`, não implementados. Um projeto novo começa sem eles.
6. **Resiliência por módulo ainda não faz parte da base.** `specs/E15-S01-resiliencia-modulo/`
   está desenhada, não implementada — não há Error Boundary nem code-splitting no molde. Um app
   copiado daqui hoje ainda morre inteiro quando uma tela quebra.

## Checklist de saída

Antes de escrever a primeira linha de código do produto:

- [ ] `pnpm run ci:local` verde
- [ ] `pnpm run test:gates` verde, e todo gate tem `.test.mjs` par
- [ ] `CLAUDE.md` fala do produto novo, não do Akros
- [ ] `docs/glossary.md` tem os termos do domínio novo, e nenhum do antigo
- [ ] `docs/PROJECT.md` e `docs/ARCHITECTURE.md` preenchidos
- [ ] ADR de autenticação e de multi-tenancy registrados
- [ ] `docs/SECURITY_DEBT.md` zerado
- [ ] Perfil de segurança escolhido (`baseline-minimo` ou `os-grade`)
- [ ] CI ativa com os 13 checks obrigatórios na branch protection
- [ ] Primeira story registrada no ROADMAP **com owner**
