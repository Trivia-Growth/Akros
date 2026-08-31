---
name: adr-0010-schema-relacional-nucleo-jsonb-blob
description: Núcleo de cada tabela é relacional (colunas reais); sub-estruturas variáveis/aninhadas (perfil imigratório, respostas de formulário) viram JSONB. Migrations vivem em supabase/migrations/, não db/migrations/.
alwaysApply: false
---

# ADR-0010 — Núcleo relacional + JSONB para blob variável; migrations em `supabase/migrations/`

**Status:** Aceito
**Data:** 2026-08-30
**Decisores:** Lucas Azevedo (Akros/Trívia Studio)
**Relacionados:** ADR-0002 (portas/adapters), ADR-0009 (single-tenant), épico E13

## Contexto

E13 começa a trocar mock por schema real. Antes da primeira `CREATE TABLE`, duas perguntas
precisam de resposta única — mudar de ideia depois de dado real existir custa migração com
backfill:

1. **Forma da tabela.** As entidades de domínio (`Cliente`, por exemplo —
   `apps/web/src/features/crm/domain/types.ts`) têm um núcleo estável (`nome`, `email`, `saude`,
   `programaId`) e sub-estruturas variáveis por natureza: `PerfilImigratorio` tem campos todos
   opcionais e um array (`familiares: Familiar[]`) cujo formato já mudou uma vez (E02-S08) e é
   plausível mudar de novo (campo de família varia por programa/país). Normalizar tudo em tabelas
   filhas (`familiares`, `enderecos`, …) para um dado que hoje é só exibido/editado como bloco,
   nunca consultado por campo interno via `WHERE`, é custo de junção pago pra sempre por uma
   flexibilidade que a UI não usa.
2. **Onde vivem as migrations.** `db/README.md` documenta `db/migrations/` — mas esse diretório
   nunca existiu neste repo, e a ferramenta real (`supabase db push`/`supabase migration new`, já
   linkado ao projeto `mhxopadkizktsenohnbm`) só reconhece `supabase/migrations/`. `db/README.md`
   é conteúdo herdado do template genérico do Padrão SO, nunca adaptado pro Supabase CLI deste
   projeto especificamente.

## Decisão

**1 — Núcleo relacional, blob JSONB pra sub-estrutura variável/aninhada.**

Regra de quando cada campo de uma entidade de domínio vira coluna própria ou entra num JSONB:

| Vira coluna própria | Vira campo dentro de um JSONB |
|---|---|
| Aparece em `WHERE`/`JOIN`/RLS policy (ex.: `cliente_id`, `programa_id`) | Só é lido/escrito como bloco pela UI (a tela mostra/edita tudo junto) |
| Tem tipo estável, presente desde a criação da entidade | Formato já mudou uma vez, ou é claramente extensível por programa/país |
| Precisa de índice ou constraint (`UNIQUE`, `FK`) | É lista aninhada de tamanho variável (`familiares[]`) |

`crm.clientes.perfil_imigratorio JSONB` é o primeiro caso — ver `design.md` do E13-S01.
**Não é "não fazer o trabalho de modelar"**: é reconhecer que a Akros pode mudar os campos do
perfil por tipo de visto sem migration nova, e a UI já trata o bloco como unidade.

**2 — Migrations em `supabase/migrations/`, não `db/migrations/`.**
`db/README.md` fica marcado como desatualizado (nota no topo do arquivo, não apagado — é
referência histórica de convenção genérica); a convenção real do projeto passa a ser
`supabase/migrations/NNNN_E0N-S0N_descricao.sql` (mesmo formato de nome, `supabase db push`/`db
diff` como comandos, não os genéricos do README).

## Alternativas consideradas

| Alternativa | Prós | Contras | Por que (não) escolhida |
|---|---|---|---|
| **A — Núcleo + JSONB (escolhida)** | Sem migration pra mudar formato de perfil por programa; queries de negócio (RLS, listagem) batem só em coluna real, rápidas | JSONB não tem FK/constraint interna; validação de formato fica no Zod da borda, não no banco | Reflete como a UI já trata o dado (bloco), sem pagar junção por flexibilidade não usada |
| **B — Tudo normalizado (tabelas filhas pra família, endereço, etc.)** | Integridade referencial completa, queries SQL diretas em qualquer subcampo | Tabela `familiares` seria FK pra `clientes`, join em toda leitura de perfil, migration nova a cada campo novo de programa | Rejeitada: custo permanente por uma consulta que a UI nunca faz (nenhuma tela filtra "clientes com filho maior de 18") |
| **C — Tudo JSONB (`dados JSONB` genérico, sem coluna própria nem pra `cliente_id`)** | Migration zero pra qualquer mudança de formato | RLS não filtra dentro de JSONB com performance/segurança confiável; `cliente_id` PRECISA ser coluna pra a policy funcionar | Rejeitada: incompatível com ADR-0009 (isolamento por `cliente_id` via RLS) |
| **D — Manter `db/migrations/` e replicar em `supabase/migrations/`** | Zero mudança de doc | Dois diretórios pra manter sincronizados manualmente, drift garantido | Rejeitada: `db/migrations/` nunca existiu de fato, sincronizar um diretório fantasma não tem valor |

## Consequências

**Positivas**
- Adicionar/mudar um campo do perfil imigratório (ex.: novo campo pro visto religioso) não pede
  migration — muda o tipo TS + Zod na borda, JSONB acomoda.
- `db/rls.template.sql` e a regra "toda tabela tem RLS FORCE" continuam valendo — a decisão é só
  sobre a FORMA da tabela, não sobre segurança de linha.
- `pnpm run lint:migrations` (GRANT-antes-de-POLICY) já escaneia `supabase/migrations/` — nenhuma
  mudança de tooling necessária, só a convenção passa a ser seguida de fato.

**Negativas / trade-offs aceitos**
- Nenhuma constraint de banco garante formato do JSONB (ex.: `familiares[].parentesco` só é
  validado pelo Zod da Edge Function, não pelo Postgres). Aceito: mesmo trade-off que qualquer
  campo de formulário livre já tem hoje no mock.
- Buscar "clientes com determinado valor dentro do perfil" exige `jsonb` operators (`->`, `@>`),
  mais lento que coluna indexada — não é um caso de uso hoje; se virar, index `GIN` resolve sem
  mudar a forma da tabela.
- `db/README.md` fica com uma nota de desatualização em vez de reescrito — reescrever é trabalho
  do E13 conforme as tabelas de cada contexto forem entrando (o README deve refletir o padrão
  real, não anteceder feito ele).
