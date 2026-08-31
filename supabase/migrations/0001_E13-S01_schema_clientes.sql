-- Description: Primeira tabela de negocio real (crm.clientes) + RLS por papel/cliente_id.
--              Prova o padrao (ADR-0009 + ADR-0010) que E13-S02..S04 replicam.
-- Story: E13-S01
-- Created: 2026-08-30

-- Rollback: DROP TABLE IF EXISTS crm.clientes; DROP SCHEMA IF EXISTS crm;
-- Nota: sem BEGIN/COMMIT explicito — o Supabase CLI ja roda cada arquivo de migration dentro da
-- propria transacao (--assume-in-transaction no Squawk, ver scripts/lint-migrations.mjs).

CREATE SCHEMA IF NOT EXISTS crm;

CREATE TABLE crm.clientes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id       uuid UNIQUE REFERENCES auth.users(id),
  lead_origem_id     uuid,
  nome               text NOT NULL,
  email              text NOT NULL,
  telefone           text NOT NULL,
  tipo_visto         text NOT NULL,
  case_manager       text NOT NULL,
  saude              text NOT NULL DEFAULT 'em_dia' CHECK (saude IN ('em_dia', 'atencao', 'atrasado')),
  programa_id        text,
  programa_versao    text,
  pasta_drive_nome   text,
  -- ADR-0010: bloco variavel/aninhado (PerfilImigratorio + Familiar[]) — nunca filtrado por
  -- subcampo em WHERE/RLS, so lido/editado como unidade pela UI.
  perfil_imigratorio jsonb,
  created_by         uuid,
  updated_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);

COMMENT ON TABLE crm.clientes IS
  'E13-S01: cliente de imigracao. auth_user_id liga a linha ao usuario do Supabase Auth cujo '
  'app_metadata.cliente_id (E12-S02) aponta pro id desta linha (a partir de E13-S07).';

-- RLS FORCE (os-grade.md: nem o dono da tabela escapa das policies)
ALTER TABLE crm.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.clientes FORCE ROW LEVEL SECURITY;

-- GRANT antes de POLICY (Postgres avalia privilegio de tabela antes de RLS — sem isto a policy
-- nunca roda, ver scripts/lint-migrations.mjs). INSERT/DELETE ficam fora: sem GRANT = sem acesso,
-- criacao/remocao de cliente e acao de service_role ate E13-S07 decidir o caso de uso real.
GRANT USAGE ON SCHEMA crm TO authenticated;
GRANT SELECT, UPDATE ON crm.clientes TO authenticated;

-- Papel decide o que e visivel (ADR-0009) — mecanismo real no Supabase e RLS lendo o claim do
-- JWT, nao GRANT fisico por schema (todo usuario autenticado cai no mesmo role `authenticated`;
-- ver design.md do E13-S01 pro porque disso nao reabrir o ADR-0009, so refinar o "como").
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
