---
name: DESIGN
description: Primeira tabela de negócio real (crm.clientes) — prova o padrão de RLS por papel + cliente_id.
story: E13-S01
alwaysApply: false
---

# design.md — E13-S01 Schema `crm.clientes` + RLS

Decisões duras já fechadas: ADR-0009 (papel + `cliente_id`, sem `org_id`), ADR-0010 (núcleo
relacional + JSONB, migrations em `supabase/migrations/`). Este documento é o mecanismo concreto
pra primeira tabela — o padrão que E13-S02..S04 replicam.

## Refinamento de mecanismo sobre o ADR-0009 (não reabre a decisão)

ADR-0009 fala em "separação por GRANT/REVOKE de schema" entre `portal` e `admin`. Na prática do
Supabase, todo usuário autenticado (`cliente` ou `admin`) cai no **mesmo** role de Postgres
(`authenticated`) — não existe GRANT nativo por papel de aplicação sem infra extra (role customizado
+ hook de mapeamento, fora de escopo aqui). O mecanismo real, e o padrão idiomático documentado
pelo próprio Supabase pra "múltiplos tipos de usuário", é **RLS lendo o claim `role` do JWT**
(`auth.jwt() -> 'app_metadata' ->> 'role'`), não GRANT físico de schema. A decisão do ADR-0009
continua de pé (papel decide o que é visível; `cliente_id` decide a linha) — só o "como" é RLS, não
GRANT-por-schema.

Tabelas continuam organizadas **por bounded context** (convenção já existente em
`docs/ARCHITECTURE.md`) — `crm.clientes` aqui, `jornada.*`/`documentos.*`/etc. nas próximas
stories. Não introduz um schema físico `portal`/`admin` novo.

## Schema

```sql
CREATE SCHEMA IF NOT EXISTS crm;

CREATE TABLE crm.clientes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id       uuid UNIQUE REFERENCES auth.users(id),  -- claim cliente_id aponta pra isto
  lead_origem_id     uuid,
  nome               text NOT NULL,
  email              text NOT NULL,
  telefone           text NOT NULL,
  tipo_visto         text NOT NULL,
  case_manager       text NOT NULL,
  saude              text NOT NULL DEFAULT 'em_dia' CHECK (saude IN ('em_dia','atencao','atrasado')),
  programa_id        text,
  programa_versao    text,
  pasta_drive_nome   text,
  perfil_imigratorio jsonb,        -- ADR-0010: bloco variável, nunca filtrado por subcampo
  created_by         uuid,
  updated_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz  -- soft delete (os-grade.md: coluna de auditoria)
);
```

`auth_user_id` é o elo que faltava: `app_metadata.cliente_id` (E12-S02) hoje é uma string igual ao
id da persona mockada — quando E13-S07 trocar o adapter, esse claim passa a ser o `id` real desta
tabela (`crm.clientes.id`), resolvido a partir de `auth_user_id = auth.uid()`. Não muda o formato
do claim, só o que ele referencia.

## RLS

```sql
ALTER TABLE crm.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.clientes FORCE ROW LEVEL SECURITY;  -- nem o dono da tabela escapa (os-grade.md)

GRANT USAGE ON SCHEMA crm TO authenticated;
GRANT SELECT, UPDATE ON crm.clientes TO authenticated;  -- INSERT/DELETE ficam só pra service_role

CREATE POLICY "admin_ve_todos" ON crm.clientes
  FOR SELECT
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "cliente_ve_a_propria_linha" ON crm.clientes
  FOR SELECT
  USING (
    auth.jwt() -> 'app_metadata' ->> 'role' = 'cliente'
    AND auth_user_id = auth.uid()
  );

CREATE POLICY "admin_atualiza_qualquer_linha" ON crm.clientes
  FOR UPDATE
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "cliente_atualiza_a_propria_linha" ON crm.clientes
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
```

`INSERT`/`DELETE` não têm policy pra `authenticated` (nem `GRANT`) — criação de cliente é ação do
admin hoje mockada como "converter lead"; fica atrás de `service_role`/Edge Function até E13-S07
decidir o caso de uso real. Sem policy = sem acesso, por padrão do Postgres.

## Verificação (sem Docker/pgTAP — direto no projeto real)

Prova de isolamento via REST (PostgREST), autenticando como os dois usuários seed de E12-S02:

```bash
# Como cliente (Carlos): só a própria linha
curl -s "$SUPABASE_URL/rest/v1/clientes?select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_CARLOS" \
  -H "Accept-Profile: crm"
# Esperado: 1 linha (a do próprio Carlos)

# Como admin (Lucas): todas as linhas
curl -s "$SUPABASE_URL/rest/v1/clientes?select=*" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN_LUCAS" \
  -H "Accept-Profile: crm"
# Esperado: N linhas (todas)
```

Isso é o que fecha o `test.fixme` do E12-S03 (AC-6) **no nível de banco** — sem esperar o
frontend trocar de adapter (E13-S07), que é onde a UI passaria a fazer essa mesma chamada.

## Fora de escopo

- Trocar `MockClienteRepository` por adapter Supabase no frontend — **E13-S07**, story separada.
  Motivo: são ~8 telas consumindo `clientes` hoje (Cliente360, Kanban, AdminDashboard, Perfil,
  ProgramasPage, ConciliacaoPage, FilaRevisaoPage, AdminAgendaPage) e a leitura reativa via
  `useMockDb` (E12-S01) precisa de uma estratégia equivalente com Supabase (Realtime ou
  polling) — decisão própria, não cabe dentro desta story.
- Migrar dado mockado de `mocks/personas.ts` pra linhas reais — a tabela nasce vazia +
  seed mínimo (só os clientes ligados aos 2 usuários seed de E12-S02), não um dump das 5 personas.
- `audit.*`, `lgpd.*` — E13-S05/S06.
