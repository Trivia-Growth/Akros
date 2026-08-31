-- Description: Schemas agenda e programas + RLS. Quinta replica do padrao. programas e o
--              segundo caso "sem cliente_id" (catalogo global da Akros, ADR-0004/ADR-0009) -
--              mesma forma de pagamentos.dados_recebimento: todo autenticado le, so admin
--              escreve. fasesTemplate/documentosExigidos viram JSONB (template versionado
--              congelado como bloco, nao instancia consultavel por subcampo).
-- Story: E13-S04
-- Created: 2026-08-30

-- Rollback: DROP TABLE IF EXISTS agenda.transcricoes, agenda.reunioes, programas.programas CASCADE;
--           DROP SCHEMA IF EXISTS agenda, programas;

CREATE SCHEMA IF NOT EXISTS agenda;
CREATE SCHEMA IF NOT EXISTS programas;

CREATE TABLE agenda.reunioes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id     uuid NOT NULL REFERENCES crm.clientes(id),
  titulo         text NOT NULL,
  inicio         timestamptz NOT NULL,
  fim            timestamptz NOT NULL,
  canal          text NOT NULL CHECK (canal IN ('calendly', 'gmail', 'outlook')),
  status         text NOT NULL CHECK (status IN ('agendada', 'realizada', 'cancelada')),
  criada_por     text CHECK (criada_por IN ('cliente', 'admin', 'agente_ia')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE agenda.transcricoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reuniao_id    uuid NOT NULL REFERENCES agenda.reunioes(id) ON DELETE CASCADE,
  texto         text NOT NULL,
  resumo        text NOT NULL,
  action_items  text[],
  provedor      text NOT NULL CHECK (provedor IN ('fireflies', 'microsoft_teams')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Catalogo global (ADR-0004/ADR-0009) — sem cliente_id de proposito.
CREATE TABLE programas.programas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo               text NOT NULL,
  nome                 text NOT NULL,
  categoria            text NOT NULL CHECK (categoria IN ('imigrante', 'nao_imigrante')),
  sujeito              text NOT NULL CHECK (sujeito IN ('individuo', 'organizacao')),
  versao               text NOT NULL,
  ativo                boolean NOT NULL DEFAULT true,
  -- ADR-0010: template versionado, congelado como bloco na jornada que o instancia — nunca
  -- consultado por subcampo atraves de programas diferentes.
  fases_template       jsonb NOT NULL,
  documentos_exigidos  jsonb NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (codigo, versao)
);

ALTER TABLE agenda.reunioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda.reunioes FORCE ROW LEVEL SECURITY;
ALTER TABLE agenda.transcricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda.transcricoes FORCE ROW LEVEL SECURITY;
ALTER TABLE programas.programas ENABLE ROW LEVEL SECURITY;
ALTER TABLE programas.programas FORCE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA agenda TO authenticated;
GRANT SELECT, UPDATE ON agenda.reunioes TO authenticated;
GRANT SELECT ON agenda.transcricoes TO authenticated;

GRANT USAGE ON SCHEMA programas TO authenticated;
GRANT SELECT, UPDATE ON programas.programas TO authenticated;

GRANT USAGE ON SCHEMA agenda TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA agenda TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA agenda GRANT ALL ON TABLES TO service_role;
GRANT USAGE ON SCHEMA programas TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA programas TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA programas GRANT ALL ON TABLES TO service_role;

CREATE POLICY "admin_ve_todas_reunioes" ON agenda.reunioes
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "cliente_ve_as_proprias_reunioes" ON agenda.reunioes
  FOR SELECT USING (cliente_id = crm.meu_cliente_id());
CREATE POLICY "admin_atualiza_qualquer_reuniao" ON agenda.reunioes
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "cliente_atualiza_a_propria_reuniao" ON agenda.reunioes
  FOR UPDATE USING (cliente_id = crm.meu_cliente_id());

CREATE POLICY "admin_ve_todas_transcricoes" ON agenda.transcricoes
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "cliente_ve_transcricoes_das_proprias_reunioes" ON agenda.transcricoes
  FOR SELECT USING (
    reuniao_id IN (SELECT id FROM agenda.reunioes WHERE cliente_id = crm.meu_cliente_id())
  );

-- programas: todo autenticado le (catalogo global), so admin escreve.
CREATE POLICY "qualquer_autenticado_le_programas" ON programas.programas
  FOR SELECT USING (true);
CREATE POLICY "so_admin_atualiza_programas" ON programas.programas
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
