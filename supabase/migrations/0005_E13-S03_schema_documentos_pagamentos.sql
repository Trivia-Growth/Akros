-- Description: Schemas documentos e pagamentos + RLS. Terceira/quarta replica do padrao de
--              E13-S01/S02. analise/metadados_fixture viram JSONB (mesmo criterio do
--              perfil_imigratorio). dados_recebimento e o primeiro caso de tabela sem
--              cliente_id — qualquer autenticado le, so admin escreve (nao e dado do cliente,
--              e a instrucao bancaria ficticia da propria Akros).
-- Story: E13-S03
-- Created: 2026-08-30

-- Rollback: DROP TABLE IF EXISTS documentos.solicitacoes_assinatura, documentos.documentos,
--           pagamentos.pagamentos, pagamentos.dados_recebimento CASCADE;
--           DROP SCHEMA IF EXISTS documentos, pagamentos;

CREATE SCHEMA IF NOT EXISTS documentos;
CREATE SCHEMA IF NOT EXISTS pagamentos;

CREATE TABLE documentos.documentos (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id             uuid NOT NULL REFERENCES crm.clientes(id),
  fase_id                uuid REFERENCES jornada.fases(id),
  nome                   text NOT NULL,
  tipo                   text NOT NULL,
  status                 text NOT NULL CHECK (status IN ('pendente', 'enviado', 'em_analise', 'aprovado', 'ajustes')),
  url_mock               text,
  enviado_em             timestamptz,
  requisito_id           text,
  -- ADR-0010: parecer da IA e metadado de fixture, lidos/escritos como bloco, nunca filtrados
  -- por subcampo.
  analise                jsonb,
  enviado_apesar_do_alerta boolean,
  decisao                jsonb,
  metadados_fixture      jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE documentos.solicitacoes_assinatura (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id  uuid NOT NULL REFERENCES documentos.documentos(id) ON DELETE CASCADE,
  status        text NOT NULL CHECK (status IN ('aguardando', 'assinado')),
  assinado_por  text,
  assinado_em   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pagamentos.pagamentos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id       uuid NOT NULL REFERENCES crm.clientes(id),
  descricao        text NOT NULL,
  valor            numeric(12, 2) NOT NULL,
  moeda            text NOT NULL CHECK (moeda IN ('BRL', 'USD')),
  status           text NOT NULL CHECK (status IN ('pendente', 'em_conferencia', 'pago', 'divergente', 'atrasado')),
  vencimento       date NOT NULL,
  tipo             text NOT NULL CHECK (tipo IN ('entrada', 'taxa_federal', 'parcela')),
  pago_em          timestamptz,
  comprovante_url  text,
  anexado_em       timestamptz,
  valor_recebido   numeric(12, 2),
  confirmado_por   text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Ficticio de proposito (ver ROADMAP pergunta aberta n8) — nao e dado do cliente, e instrucao
-- bancaria da Akros. Sem cliente_id.
CREATE TABLE pagamentos.dados_recebimento (
  moeda        text PRIMARY KEY CHECK (moeda IN ('BRL', 'USD')),
  titular      text NOT NULL,
  banco        text NOT NULL,
  agencia      text,
  conta        text,
  chave_pix    text,
  routing_number text,
  account_number text,
  swift        text,
  instrucoes   text NOT NULL
);

ALTER TABLE documentos.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos.documentos FORCE ROW LEVEL SECURITY;
ALTER TABLE documentos.solicitacoes_assinatura ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos.solicitacoes_assinatura FORCE ROW LEVEL SECURITY;
ALTER TABLE pagamentos.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos.pagamentos FORCE ROW LEVEL SECURITY;
ALTER TABLE pagamentos.dados_recebimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos.dados_recebimento FORCE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA documentos TO authenticated;
GRANT SELECT, UPDATE ON documentos.documentos TO authenticated;
GRANT SELECT ON documentos.solicitacoes_assinatura TO authenticated;

GRANT USAGE ON SCHEMA pagamentos TO authenticated;
GRANT SELECT, UPDATE ON pagamentos.pagamentos TO authenticated;
GRANT SELECT, UPDATE ON pagamentos.dados_recebimento TO authenticated;

-- service_role (GRANT feito desde ja — gap descoberto e corrigido em E13-S01/S02)
GRANT USAGE ON SCHEMA documentos TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA documentos TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA documentos GRANT ALL ON TABLES TO service_role;
GRANT USAGE ON SCHEMA pagamentos TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA pagamentos TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA pagamentos GRANT ALL ON TABLES TO service_role;

CREATE POLICY "admin_ve_todos_documentos" ON documentos.documentos
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "cliente_ve_os_proprios_documentos" ON documentos.documentos
  FOR SELECT USING (cliente_id = crm.meu_cliente_id());
CREATE POLICY "admin_atualiza_qualquer_documento" ON documentos.documentos
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "cliente_atualiza_o_proprio_documento" ON documentos.documentos
  FOR UPDATE USING (cliente_id = crm.meu_cliente_id());

CREATE POLICY "admin_ve_todas_assinaturas" ON documentos.solicitacoes_assinatura
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "cliente_ve_assinaturas_dos_proprios_documentos" ON documentos.solicitacoes_assinatura
  FOR SELECT USING (
    documento_id IN (SELECT id FROM documentos.documentos WHERE cliente_id = crm.meu_cliente_id())
  );

CREATE POLICY "admin_ve_todos_pagamentos" ON pagamentos.pagamentos
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "cliente_ve_os_proprios_pagamentos" ON pagamentos.pagamentos
  FOR SELECT USING (cliente_id = crm.meu_cliente_id());
CREATE POLICY "admin_atualiza_qualquer_pagamento" ON pagamentos.pagamentos
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "cliente_atualiza_o_proprio_pagamento" ON pagamentos.pagamentos
  FOR UPDATE USING (cliente_id = crm.meu_cliente_id());

-- dados_recebimento: nao e dado de cliente — qualquer autenticado le, so admin escreve.
CREATE POLICY "qualquer_autenticado_le_dados_recebimento" ON pagamentos.dados_recebimento
  FOR SELECT USING (true);
CREATE POLICY "so_admin_atualiza_dados_recebimento" ON pagamentos.dados_recebimento
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
