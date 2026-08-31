-- Description: Schema jornada (jornadas/fases/etapas) + RLS. Segunda replica do padrao de
--              E13-S01. fases/etapas normalizadas (nao JSONB) porque sao consultadas atraves de
--              jornadas diferentes (painel de gargalos, alertas — E09-S03/S04), ao contrario do
--              perfil_imigratorio de crm.clientes.
-- Story: E13-S02
-- Created: 2026-08-30

-- Rollback: DROP TABLE IF EXISTS jornada.etapas, jornada.fases, jornada.jornadas CASCADE;
--           DROP FUNCTION IF EXISTS crm.meu_cliente_id(); DROP SCHEMA IF EXISTS jornada;

-- Helper reaproveitado por toda policy "cliente so ve o que e seu" dai pra frente. Sem
-- SECURITY DEFINER: roda com o privilegio de quem chama, a RLS de crm.clientes (ja FORCE) decide
-- o que a funcao enxerga — nao concede privilegio novo, so encapsula uma leitura que o
-- chamador ja podia fazer.
CREATE FUNCTION crm.meu_cliente_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM crm.clientes WHERE auth_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION crm.meu_cliente_id() TO authenticated;

CREATE SCHEMA IF NOT EXISTS jornada;

CREATE TABLE jornada.jornadas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid NOT NULL REFERENCES crm.clientes(id),
  fase_atual_id   uuid,
  programa_id     text,
  programa_versao text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jornada.fases (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id uuid NOT NULL REFERENCES jornada.jornadas(id) ON DELETE CASCADE,
  ordem      int NOT NULL,
  titulo     text NOT NULL,
  descricao  text NOT NULL,
  status     text NOT NULL CHECK (status IN ('bloqueada', 'liberada', 'em_andamento', 'concluida')),
  UNIQUE (jornada_id, ordem)
);

ALTER TABLE jornada.jornadas
  ADD CONSTRAINT jornadas_fase_atual_fk FOREIGN KEY (fase_atual_id) REFERENCES jornada.fases(id);

CREATE TABLE jornada.etapas (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fase_id                uuid NOT NULL REFERENCES jornada.fases(id) ON DELETE CASCADE,
  titulo                 text NOT NULL,
  descricao              text NOT NULL,
  status                 text NOT NULL CHECK (status IN ('pendente', 'em_analise', 'concluida')),
  prazo_medio_dias_uteis int,
  documentos_requeridos  text[],
  responsavel            text NOT NULL CHECK (responsavel IN ('cliente', 'akros', 'terceiro', 'uscis')),
  responsavel_detalhe    text,
  desde_em               timestamptz,
  iniciada_em            timestamptz,
  concluida_real_em      timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE jornada.jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE jornada.jornadas FORCE ROW LEVEL SECURITY;
ALTER TABLE jornada.fases ENABLE ROW LEVEL SECURITY;
ALTER TABLE jornada.fases FORCE ROW LEVEL SECURITY;
ALTER TABLE jornada.etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE jornada.etapas FORCE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA jornada TO authenticated;
GRANT SELECT, UPDATE ON jornada.jornadas TO authenticated;
GRANT SELECT, UPDATE ON jornada.fases TO authenticated;
GRANT SELECT, UPDATE ON jornada.etapas TO authenticated;

CREATE POLICY "admin_ve_todas_jornadas" ON jornada.jornadas
  FOR SELECT
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "cliente_ve_a_propria_jornada" ON jornada.jornadas
  FOR SELECT
  USING (cliente_id = crm.meu_cliente_id());

CREATE POLICY "admin_ve_todas_fases" ON jornada.fases
  FOR SELECT
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "cliente_ve_fases_da_propria_jornada" ON jornada.fases
  FOR SELECT
  USING (jornada_id IN (SELECT id FROM jornada.jornadas WHERE cliente_id = crm.meu_cliente_id()));

CREATE POLICY "admin_ve_todas_etapas" ON jornada.etapas
  FOR SELECT
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "cliente_ve_etapas_da_propria_jornada" ON jornada.etapas
  FOR SELECT
  USING (
    fase_id IN (
      SELECT f.id FROM jornada.fases f
      JOIN jornada.jornadas j ON j.id = f.jornada_id
      WHERE j.cliente_id = crm.meu_cliente_id()
    )
  );

-- UPDATE: admin sempre; cliente só na própria etapa (self-service de envio, E09-S05). A regra de
-- QUAL transição de status é permitida (pendente->em_analise só cliente, o resto só Akros) é
-- lógica de aplicação (RPC/Edge Function), fora de escopo de RLS — não implementada ainda.
CREATE POLICY "admin_atualiza_qualquer_etapa" ON jornada.etapas
  FOR UPDATE
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "cliente_atualiza_etapa_da_propria_jornada" ON jornada.etapas
  FOR UPDATE
  USING (
    fase_id IN (
      SELECT f.id FROM jornada.fases f
      JOIN jornada.jornadas j ON j.id = f.jornada_id
      WHERE j.cliente_id = crm.meu_cliente_id()
    )
  );
