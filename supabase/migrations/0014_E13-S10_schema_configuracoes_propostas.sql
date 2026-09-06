-- Description: Onda 0 de saida do mock: crm.propostas e configuracoes (equipe, integracoes,
--              contas de agenda/canal e compartilhamentos), com RLS admin-only e auditoria.
-- Story: E13-S10
-- Created: 2026-09-05

-- Rollback: DROP TABLE IF EXISTS configuracoes.contas_agenda_compartilhamentos,
--           configuracoes.contas_agenda, configuracoes.contas_canal,
--           configuracoes.integracoes, configuracoes.equipe, crm.propostas CASCADE;
--           DROP FUNCTION IF EXISTS configuracoes.metadados_publicos_sem_segredo(jsonb);
--           DROP SCHEMA IF EXISTS configuracoes;

CREATE SCHEMA IF NOT EXISTS configuracoes;

-- Metadados ficam flexiveis para IDs publicos de provedores, mas a camada persistente rejeita
-- nomes de campos que carregariam segredo. Valor sensivel sem chave proibida tambem e violacao
-- de contrato, resolvida por Vault em E14-S02 antes de qualquer adapter real.
CREATE FUNCTION configuracoes.metadados_publicos_sem_segredo(p_valor jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_chave text;
  v_item  jsonb;
BEGIN
  CASE jsonb_typeof(p_valor)
    WHEN 'object' THEN
      FOR v_chave, v_item IN SELECT key, value FROM jsonb_each(p_valor)
      LOOP
        IF lower(v_chave) ~ '(token|segredo|secret|senha|password|credencial|credential)'
           OR NOT configuracoes.metadados_publicos_sem_segredo(v_item) THEN
          RETURN false;
        END IF;
      END LOOP;
    WHEN 'array' THEN
      FOR v_item IN SELECT value FROM jsonb_array_elements(p_valor)
      LOOP
        IF NOT configuracoes.metadados_publicos_sem_segredo(v_item) THEN
          RETURN false;
        END IF;
      END LOOP;
    ELSE
      NULL; -- escalar nao tem chave a validar.
  END CASE;

  RETURN true;
END;
$$;

CREATE TABLE crm.propostas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid REFERENCES crm.leads(id),
  cliente_id   uuid REFERENCES crm.clientes(id),
  escopo       text NOT NULL,
  itens_escopo jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(itens_escopo) = 'array'),
  tipo_visto   text NOT NULL,
  valor        numeric(12, 2) NOT NULL CHECK (valor >= 0),
  moeda        text NOT NULL CHECK (moeda IN ('BRL', 'USD')),
  condicoes    text NOT NULL,
  valido_ate   timestamptz NOT NULL,
  status       text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'enviada', 'aceita', 'recusada')),
  created_by   uuid,
  updated_by   uuid,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  CONSTRAINT propostas_origem_exata CHECK (num_nonnulls(lead_id, cliente_id) = 1)
);

CREATE INDEX propostas_lead_idx ON crm.propostas (lead_id) WHERE deleted_at IS NULL;
CREATE INDEX propostas_cliente_idx ON crm.propostas (cliente_id) WHERE deleted_at IS NULL;

CREATE TABLE configuracoes.equipe (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL,
  cargo      text NOT NULL,
  avatar_url text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE configuracoes.integracoes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                text NOT NULL UNIQUE,
  nome                  text NOT NULL,
  fornecedor            text NOT NULL,
  categoria             text NOT NULL
    CHECK (categoria IN ('mensageria', 'automacao', 'pagamentos', 'crm', 'transcricao')),
  descricao             text NOT NULL,
  ativa                 boolean NOT NULL DEFAULT true,
  segredo_configurado   boolean NOT NULL DEFAULT false,
  metadados_publicos    jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadados_publicos) = 'object')
    CHECK (configuracoes.metadados_publicos_sem_segredo(metadados_publicos)),
  atualizado_em         timestamptz,
  created_by            uuid,
  updated_by            uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);

CREATE TABLE configuracoes.contas_agenda (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provedor                 text NOT NULL CHECK (provedor IN ('google', 'microsoft', 'calendly')),
  nome_exibicao            text NOT NULL,
  ativa                    boolean NOT NULL DEFAULT true,
  conectado_em             timestamptz NOT NULL DEFAULT now(),
  escopos                  text[] NOT NULL
    CHECK (cardinality(escopos) BETWEEN 1 AND 3)
    CHECK (escopos <@ ARRAY['agenda', 'email', 'arquivos']::text[]),
  dono_id                  uuid NOT NULL REFERENCES configuracoes.equipe(id),
  email_endereco           text,
  pasta_raiz               text,
  credenciais_configuradas boolean NOT NULL DEFAULT false,
  metadados_publicos       jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadados_publicos) = 'object')
    CHECK (configuracoes.metadados_publicos_sem_segredo(metadados_publicos)),
  created_by               uuid,
  updated_by               uuid,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz,
  CONSTRAINT contas_agenda_email_escopo CHECK (email_endereco IS NULL OR 'email' = ANY(escopos)),
  CONSTRAINT contas_agenda_pasta_escopo CHECK (pasta_raiz IS NULL OR 'arquivos' = ANY(escopos))
);

CREATE INDEX contas_agenda_dono_idx ON configuracoes.contas_agenda (dono_id) WHERE deleted_at IS NULL;

CREATE TABLE configuracoes.contas_agenda_compartilhamentos (
  id         uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  conta_id   uuid NOT NULL REFERENCES configuracoes.contas_agenda(id),
  membro_id  uuid NOT NULL REFERENCES configuracoes.equipe(id),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conta_id, membro_id)
);

CREATE INDEX contas_agenda_compartilhamentos_membro_idx
  ON configuracoes.contas_agenda_compartilhamentos (membro_id);

CREATE TABLE configuracoes.contas_canal (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provedor                 text NOT NULL
    CHECK (provedor IN ('whatsapp_oficial', 'evolution', 'instagram')),
  nome_exibicao            text NOT NULL,
  identificador            text NOT NULL,
  ativa                    boolean NOT NULL DEFAULT true,
  conectado_em             timestamptz NOT NULL DEFAULT now(),
  credenciais_configuradas boolean NOT NULL DEFAULT false,
  metadados_publicos       jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadados_publicos) = 'object')
    CHECK (configuracoes.metadados_publicos_sem_segredo(metadados_publicos)),
  created_by               uuid,
  updated_by               uuid,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz
);

ALTER TABLE crm.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.propostas FORCE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.equipe FORCE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.integracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.integracoes FORCE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.contas_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.contas_agenda FORCE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.contas_agenda_compartilhamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.contas_agenda_compartilhamentos FORCE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.contas_canal ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.contas_canal FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON crm.propostas TO authenticated;
GRANT USAGE ON SCHEMA configuracoes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON configuracoes.equipe TO authenticated;
GRANT SELECT, INSERT, UPDATE ON configuracoes.integracoes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON configuracoes.contas_agenda TO authenticated;
GRANT SELECT, INSERT, UPDATE ON configuracoes.contas_agenda_compartilhamentos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON configuracoes.contas_canal TO authenticated;

GRANT USAGE ON SCHEMA configuracoes TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA configuracoes TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA configuracoes GRANT ALL ON TABLES TO service_role;

CREATE POLICY "so_admin_ve_propostas" ON crm.propostas
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_cria_propostas" ON crm.propostas
  FOR INSERT WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_edita_propostas" ON crm.propostas
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "so_admin_ve_equipe" ON configuracoes.equipe
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_cria_equipe" ON configuracoes.equipe
  FOR INSERT WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_edita_equipe" ON configuracoes.equipe
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "so_admin_ve_integracoes" ON configuracoes.integracoes
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_cria_integracoes" ON configuracoes.integracoes
  FOR INSERT WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_edita_integracoes" ON configuracoes.integracoes
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "so_admin_ve_contas_agenda" ON configuracoes.contas_agenda
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_cria_contas_agenda" ON configuracoes.contas_agenda
  FOR INSERT WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_edita_contas_agenda" ON configuracoes.contas_agenda
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "so_admin_ve_compartilhamentos_agenda" ON configuracoes.contas_agenda_compartilhamentos
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_cria_compartilhamentos_agenda" ON configuracoes.contas_agenda_compartilhamentos
  FOR INSERT WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_edita_compartilhamentos_agenda" ON configuracoes.contas_agenda_compartilhamentos
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "so_admin_ve_contas_canal" ON configuracoes.contas_canal
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_cria_contas_canal" ON configuracoes.contas_canal
  FOR INSERT WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_edita_contas_canal" ON configuracoes.contas_canal
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE TRIGGER audit_crm_propostas AFTER INSERT OR UPDATE OR DELETE ON crm.propostas
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_configuracoes_equipe AFTER INSERT OR UPDATE OR DELETE ON configuracoes.equipe
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_configuracoes_integracoes AFTER INSERT OR UPDATE OR DELETE ON configuracoes.integracoes
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_configuracoes_contas_agenda AFTER INSERT OR UPDATE OR DELETE ON configuracoes.contas_agenda
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_configuracoes_compartilhamentos AFTER INSERT OR UPDATE OR DELETE
  ON configuracoes.contas_agenda_compartilhamentos
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_configuracoes_contas_canal AFTER INSERT OR UPDATE OR DELETE ON configuracoes.contas_canal
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
