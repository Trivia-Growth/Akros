---
name: DESIGN
description: Schema jornada (jornadas/fases/etapas) — réplica do padrão de E13-S01, com uma diferença de forma.
story: E13-S02
alwaysApply: false
---

# design.md — E13-S02 Schema `jornada`

Mecanismo de RLS (papel via claim do JWT, `cliente_id`) e convenção de migration já fechados em
`specs/E13-S01-schema-clientes-rls/design.md` e ADR-0010 — não repetido aqui.

## Diferença de forma em relação a `crm.clientes` (aplicando o critério do ADR-0010, não mudando-o)

`Jornada.fases`/`Fase.etapas` (`apps/web/src/features/jornada/domain/types.ts`) são aninhados como
o `perfilImigratorio` de `crm.clientes` — mas ao contrário dele, **etapa é consultada através de
jornadas diferentes**: E09-S03 (painel de gargalos) e E09-S04 (alertas) filtram etapas por
`status`/`responsavel`/tempo parado **através de todos os clientes**, não dentro de uma jornada só.
Isso é exatamente o caso "aparece em WHERE/JOIN" da tabela do ADR-0010 — vira tabela própria, não
JSONB.

`jornada.jornadas` → `jornada.fases` → `jornada.etapas`, três tabelas normalizadas com FK.

## Nova peça: função helper `crm.meu_cliente_id()`

Toda policy de "cliente só vê o que é seu" nas próximas tabelas (aqui e em documentos/pagamentos)
repete a mesma sub-busca (`SELECT id FROM crm.clientes WHERE auth_user_id = auth.uid()`). Ao
invés de copiar a sub-query em cada `CREATE POLICY` dali em diante, uma função SQL pequena:

```sql
CREATE FUNCTION crm.meu_cliente_id() RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT id FROM crm.clientes WHERE auth_user_id = auth.uid() $$;
```

Sem `SECURITY DEFINER` — roda com o privilégio de quem chama, então a própria RLS de
`crm.clientes` (já FORCE, já filtrando por linha) decide o que a função enxerga. Nenhum
privilégio novo é concedido; é só encapsular uma leitura que o chamador já podia fazer.

## Schema

```sql
CREATE SCHEMA IF NOT EXISTS jornada;

CREATE TABLE jornada.jornadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES crm.clientes(id),
  fase_atual_id uuid,  -- FK adicionada via ALTER, depois que jornada.fases existe
  programa_id text,
  programa_versao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jornada.fases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id uuid NOT NULL REFERENCES jornada.jornadas(id) ON DELETE CASCADE,
  ordem int NOT NULL,
  titulo text NOT NULL,
  descricao text NOT NULL,
  status text NOT NULL CHECK (status IN ('bloqueada','liberada','em_andamento','concluida')),
  UNIQUE (jornada_id, ordem)
);

ALTER TABLE jornada.jornadas
  ADD CONSTRAINT jornadas_fase_atual_fk FOREIGN KEY (fase_atual_id) REFERENCES jornada.fases(id);

CREATE TABLE jornada.etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase_id uuid NOT NULL REFERENCES jornada.fases(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text NOT NULL,
  status text NOT NULL CHECK (status IN ('pendente','em_analise','concluida')),
  prazo_medio_dias_uteis int,
  documentos_requeridos text[],
  responsavel text NOT NULL CHECK (responsavel IN ('cliente','akros','terceiro','uscis')),
  responsavel_detalhe text,
  desde_em timestamptz,
  iniciada_em timestamptz,
  concluida_real_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

## RLS

Mesmo padrão de `crm.clientes`: admin vê tudo, cliente vê só o que liga (via `cliente_id` direto
em `jornadas`; via `jornada_id`/`fase_id` em cascata pras outras duas). `UPDATE` de etapa por
cliente existe no schema (self-service de envio, E09-S05) — a **regra de transição de estado**
(pendente→em_analise só o cliente, em_analise→concluida só a Akros) fica pra quando existir RPC/
Edge Function em cima disto (fora de escopo aqui, é código de aplicação, não RLS).

## Fora de escopo

Idêntico a E13-S01: sem troca de adapter no frontend (E13-S07); seed mínimo, não as 5 personas
inteiras; `audit`/`lgpd` (E13-S05/S06).
