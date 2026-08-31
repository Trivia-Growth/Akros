-- Description: Schema audit append-only + trigger generico nas 17 tabelas de negocio de
--              E13-S01..S05. service_role tem BYPASSRLS por padrao no Supabase -- RLS nao
--              alcanca ele. "Append-only pra todos, inclusive service_role" (os-grade.md) so
--              e possivel via GRANT (nunca conceder UPDATE/DELETE a ninguem), nao via policy.
-- Story: E13-S06
-- Created: 2026-08-31

-- Rollback: DROP TABLE IF EXISTS audit.eventos CASCADE; DROP FUNCTION IF EXISTS
--           audit.registrar_mudanca() CASCADE; DROP SCHEMA IF EXISTS audit;
--           (os DROP TRIGGER de cada tabela caem junto com CASCADE na funcao)

CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE audit.eventos (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tabela         text NOT NULL,
  operacao       text NOT NULL CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE')),
  registro_id    uuid,
  dado_anterior  jsonb,
  dado_novo      jsonb,
  autor          uuid,
  ocorrido_em    timestamptz NOT NULL DEFAULT now()
);

-- SECURITY DEFINER de proposito aqui (ao contrario de crm.meu_cliente_id(), E13-S02, que evitou):
-- quem grava a linha de negocio nao precisa de privilegio nenhum em audit.eventos, e nao pode
-- alterar o comportamento da funcao porque nao e dono dela. SET search_path fixo e obrigatorio
-- em toda SECURITY DEFINER -- sem isso, search_path do chamador poderia sequestrar a funcao.
CREATE FUNCTION audit.registrar_mudanca()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, pg_temp
AS $$
BEGIN
  INSERT INTO audit.eventos (tabela, operacao, registro_id, dado_anterior, dado_novo, autor)
  VALUES (
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    TG_OP,
    COALESCE((NEW).id, (OLD).id),
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

ALTER TABLE audit.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.eventos FORCE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA audit TO authenticated;
-- Só SELECT -- nunca INSERT/UPDATE/DELETE via GRANT direto. A gravacao acontece pelo trigger
-- (SECURITY DEFINER, roda com o privilegio do dono da funcao, nao de quem disparou o trigger).
GRANT SELECT ON audit.eventos TO authenticated;
GRANT USAGE ON SCHEMA audit TO service_role;
GRANT SELECT ON audit.eventos TO service_role;

-- Admin-only: trilha de auditoria e operacao de staff, mesma forma de
-- comunicacao.regras_atendimento_ia (E13-S05).
CREATE POLICY "so_admin_ve_auditoria" ON audit.eventos
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- Trigger generico nas 17 tabelas de negocio (E13-S01..S05).
CREATE TRIGGER audit_clientes AFTER INSERT OR UPDATE OR DELETE ON crm.clientes
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();

CREATE TRIGGER audit_jornadas AFTER INSERT OR UPDATE OR DELETE ON jornada.jornadas
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_fases AFTER INSERT OR UPDATE OR DELETE ON jornada.fases
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_etapas AFTER INSERT OR UPDATE OR DELETE ON jornada.etapas
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();

CREATE TRIGGER audit_documentos AFTER INSERT OR UPDATE OR DELETE ON documentos.documentos
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_solicitacoes_assinatura AFTER INSERT OR UPDATE OR DELETE ON documentos.solicitacoes_assinatura
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();

CREATE TRIGGER audit_pagamentos AFTER INSERT OR UPDATE OR DELETE ON pagamentos.pagamentos
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_dados_recebimento AFTER INSERT OR UPDATE OR DELETE ON pagamentos.dados_recebimento
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();

CREATE TRIGGER audit_reunioes AFTER INSERT OR UPDATE OR DELETE ON agenda.reunioes
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_transcricoes AFTER INSERT OR UPDATE OR DELETE ON agenda.transcricoes
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();

CREATE TRIGGER audit_programas AFTER INSERT OR UPDATE OR DELETE ON programas.programas
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();

CREATE TRIGGER audit_conversas AFTER INSERT OR UPDATE OR DELETE ON comunicacao.conversas
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_email_threads AFTER INSERT OR UPDATE OR DELETE ON comunicacao.email_threads
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_eventos_comunicacao AFTER INSERT OR UPDATE OR DELETE ON comunicacao.eventos
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_regras_atendimento_ia AFTER INSERT OR UPDATE OR DELETE ON comunicacao.regras_atendimento_ia
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_fontes_conhecimento AFTER INSERT OR UPDATE OR DELETE ON comunicacao.fontes_conhecimento
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
