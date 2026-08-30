-- Description: Schema comunicacao (conversas, e-mail, timeline, agente IA, base de
--              conhecimento) + RLS. Sexta replica do padrao, com um caso novo: tabela
--              admin-only (regras_atendimento_ia, fontes_conhecimento) sem nenhuma policy de
--              cliente — nenhum cliente le a propria config de agente.
-- Story: E13-S05
-- Created: 2026-08-30

-- Rollback: DROP TABLE IF EXISTS comunicacao.conversas, comunicacao.email_threads,
--           comunicacao.eventos, comunicacao.regras_atendimento_ia,
--           comunicacao.fontes_conhecimento CASCADE;
--           DROP SCHEMA IF EXISTS comunicacao;

CREATE SCHEMA IF NOT EXISTS comunicacao;

CREATE TABLE comunicacao.conversas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid NOT NULL REFERENCES crm.clientes(id),
  cliente_nome    text NOT NULL,
  canal           text NOT NULL CHECK (canal IN ('whatsapp_oficial', 'evolution', 'instagram')),
  -- ADR-0010: thread lida/escrita como bloco, nunca consultada por mensagem atraves de
  -- conversas diferentes.
  mensagens       jsonb NOT NULL DEFAULT '[]',
  atendido_por_ia boolean NOT NULL DEFAULT false,
  custo_ia        numeric(10, 4),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE comunicacao.email_threads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- nullable: thread pode chegar de um lead ainda nao convertido (crm.leads nao existe ainda).
  cliente_id     uuid REFERENCES crm.clientes(id),
  cliente_nome   text,
  conta_email_id text,
  assunto        text NOT NULL,
  mensagens      jsonb NOT NULL DEFAULT '[]',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE comunicacao.eventos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- nullable pelo mesmo motivo de email_threads.cliente_id — evento de lead fica invisivel pra
  -- qualquer cliente ate a conversao popular a coluna (comportamento correto, nao vazamento).
  cliente_id         uuid REFERENCES crm.clientes(id),
  canal              text NOT NULL CHECK (canal IN ('whatsapp', 'email', 'chat_portal', 'reuniao', 'sistema')),
  direcao            text NOT NULL CHECK (direcao IN ('entrada', 'saida', 'interno')),
  autor              text NOT NULL,
  conteudo           text NOT NULL,
  anexos             jsonb,
  ocorrido_em        timestamptz NOT NULL,
  origem_id          text,
  pendente_de_canal  boolean,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Admin-only: config do agente de IA. Nenhum cliente le a propria config de atendimento.
CREATE TABLE comunicacao.regras_atendimento_ia (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo                  boolean NOT NULL DEFAULT true,
  nome_agente            text NOT NULL,
  funcao                 text NOT NULL,
  contas_canal_ids       text[] NOT NULL DEFAULT '{}',
  alma                   text NOT NULL,
  saudacao               text NOT NULL,
  janelas_atendimento    jsonb NOT NULL DEFAULT '[]',
  topicos                jsonb NOT NULL DEFAULT '[]',
  mensagem_handoff       text NOT NULL,
  base_conhecimento_ids  text[] NOT NULL DEFAULT '{}',
  correcoes              jsonb NOT NULL DEFAULT '[]',
  memoria                jsonb,
  ferramenta_agendamento jsonb,
  llm                    jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- Admin-only: catalogo de base de conhecimento compartilhado (E04-S10).
CREATE TABLE comunicacao.fontes_conhecimento (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome    text NOT NULL,
  tipo    text NOT NULL CHECK (tipo IN ('documento', 'url', 'faq', 'base_interna')),
  status  text NOT NULL CHECK (status IN ('pronta', 'indexando')),
  itens   int NOT NULL DEFAULT 0
);

ALTER TABLE comunicacao.conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicacao.conversas FORCE ROW LEVEL SECURITY;
ALTER TABLE comunicacao.email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicacao.email_threads FORCE ROW LEVEL SECURITY;
ALTER TABLE comunicacao.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicacao.eventos FORCE ROW LEVEL SECURITY;
ALTER TABLE comunicacao.regras_atendimento_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicacao.regras_atendimento_ia FORCE ROW LEVEL SECURITY;
ALTER TABLE comunicacao.fontes_conhecimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicacao.fontes_conhecimento FORCE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA comunicacao TO authenticated;
GRANT SELECT, UPDATE ON comunicacao.conversas TO authenticated;
GRANT SELECT, UPDATE ON comunicacao.email_threads TO authenticated;
GRANT SELECT ON comunicacao.eventos TO authenticated;
GRANT SELECT ON comunicacao.regras_atendimento_ia TO authenticated;
GRANT SELECT ON comunicacao.fontes_conhecimento TO authenticated;

GRANT USAGE ON SCHEMA comunicacao TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA comunicacao TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA comunicacao GRANT ALL ON TABLES TO service_role;

CREATE POLICY "admin_ve_todas_conversas" ON comunicacao.conversas
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "cliente_ve_as_proprias_conversas" ON comunicacao.conversas
  FOR SELECT USING (cliente_id = crm.meu_cliente_id());
CREATE POLICY "admin_atualiza_qualquer_conversa" ON comunicacao.conversas
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "admin_ve_todos_email_threads" ON comunicacao.email_threads
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "cliente_ve_os_proprios_email_threads" ON comunicacao.email_threads
  FOR SELECT USING (cliente_id = crm.meu_cliente_id());
CREATE POLICY "admin_atualiza_qualquer_email_thread" ON comunicacao.email_threads
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "admin_ve_todos_eventos" ON comunicacao.eventos
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "cliente_ve_os_proprios_eventos" ON comunicacao.eventos
  FOR SELECT USING (cliente_id = crm.meu_cliente_id());

-- Admin-only de proposito: nenhuma policy de cliente aqui. GRANT SELECT existe (senao o erro
-- vazaria "tabela nao existe" em vez de "sem linha"); RLS sem policy de cliente = 0 linhas.
CREATE POLICY "so_admin_ve_regras_atendimento_ia" ON comunicacao.regras_atendimento_ia
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE POLICY "so_admin_ve_fontes_conhecimento" ON comunicacao.fontes_conhecimento
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
