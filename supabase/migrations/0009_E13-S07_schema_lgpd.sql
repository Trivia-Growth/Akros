-- Description: Schema lgpd (consentimentos, solicitacoes de export/delete) + RLS + auditoria.
--              Oitava replica do padrao. Tabelas nascem direto do checklist de os-grade.md, sem
--              entidade previa no mock.
-- Story: E13-S07
-- Created: 2026-08-31

-- Rollback: DROP TRIGGER IF EXISTS audit_lgpd_consentimentos ON lgpd.consentimentos;
--           DROP TRIGGER IF EXISTS audit_lgpd_solicitacoes ON lgpd.solicitacoes;
--           DROP TABLE IF EXISTS lgpd.consentimentos, lgpd.solicitacoes CASCADE;
--           DROP SCHEMA IF EXISTS lgpd;

CREATE SCHEMA IF NOT EXISTS lgpd;

CREATE TABLE lgpd.consentimentos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid NOT NULL REFERENCES crm.clientes(id),
  tipo        text NOT NULL,
  aceito      boolean NOT NULL,
  aceito_em   timestamptz NOT NULL DEFAULT now(),
  revogado_em timestamptz
);

CREATE TABLE lgpd.solicitacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid NOT NULL REFERENCES crm.clientes(id),
  tipo            text NOT NULL CHECK (tipo IN ('export', 'delete')),
  status          text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida', 'negada')),
  solicitado_em   timestamptz NOT NULL DEFAULT now(),
  concluido_em    timestamptz,
  motivo_negacao  text
);

ALTER TABLE lgpd.consentimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lgpd.consentimentos FORCE ROW LEVEL SECURITY;
ALTER TABLE lgpd.solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lgpd.solicitacoes FORCE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA lgpd TO authenticated;
GRANT SELECT, INSERT ON lgpd.consentimentos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON lgpd.solicitacoes TO authenticated;

GRANT USAGE ON SCHEMA lgpd TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA lgpd TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA lgpd GRANT ALL ON TABLES TO service_role;

CREATE POLICY "admin_ve_todos_consentimentos" ON lgpd.consentimentos
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "cliente_ve_os_proprios_consentimentos" ON lgpd.consentimentos
  FOR SELECT USING (cliente_id = crm.meu_cliente_id());
CREATE POLICY "cliente_cria_o_proprio_consentimento" ON lgpd.consentimentos
  FOR INSERT WITH CHECK (cliente_id = crm.meu_cliente_id());

CREATE POLICY "admin_ve_todas_solicitacoes" ON lgpd.solicitacoes
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "cliente_ve_as_proprias_solicitacoes" ON lgpd.solicitacoes
  FOR SELECT USING (cliente_id = crm.meu_cliente_id());
CREATE POLICY "cliente_cria_a_propria_solicitacao" ON lgpd.solicitacoes
  FOR INSERT WITH CHECK (cliente_id = crm.meu_cliente_id());
-- So admin processa (muda status/conclusao) -- cliente pode criar, nao decidir o proprio pedido.
CREATE POLICY "so_admin_processa_solicitacao" ON lgpd.solicitacoes
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE TRIGGER audit_lgpd_consentimentos AFTER INSERT OR UPDATE OR DELETE ON lgpd.consentimentos
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_lgpd_solicitacoes AFTER INSERT OR UPDATE OR DELETE ON lgpd.solicitacoes
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
