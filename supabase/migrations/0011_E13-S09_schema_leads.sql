-- Description: Tabela crm.leads + RLS + FK que faltava de crm.clientes.lead_origem_id.
--              Destrava as 6 telas que E13-S08 deixou em mock por dependerem de
--              criarClienteAPartirDeLead, que nao tinha tabela de lead pra ler.
-- Story: E13-S09
-- Created: 2026-08-31

-- Rollback: ALTER TABLE crm.clientes DROP CONSTRAINT IF EXISTS clientes_lead_origem_fk;
--           DROP TRIGGER IF EXISTS audit_crm_leads ON crm.leads;
--           DROP TABLE IF EXISTS crm.leads CASCADE;

CREATE TABLE crm.leads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  text NOT NULL,
  email                 text NOT NULL,
  telefone              text NOT NULL,
  origem                text NOT NULL,
  tipo_visto_interesse  text NOT NULL,
  area_profissao        text,
  mensagem              text,
  estagio               text NOT NULL DEFAULT 'lead'
    CHECK (estagio IN ('lead','qualificado','reuniao_agendada','em_negociacao','fechado','descartado')),
  -- E11-S05 AC-6: exclusao obrigatoria de qualquer segmento de reativacao.
  nao_contatar          boolean NOT NULL DEFAULT false,
  -- ADR-0010: blocos lidos/editados como unidade, nunca filtrados por subcampo em WHERE ou RLS.
  -- `notas` e lista append-only de texto; os demais sao estado de maquina do lead (E11-S01/S03/S04).
  notas                 jsonb NOT NULL DEFAULT '[]'::jsonb,
  perfil                jsonb,
  perfil_origem         jsonb,
  qualificacao          jsonb,
  cadencia              jsonb,
  gate_agendamento      jsonb,
  created_by            uuid,
  updated_by            uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);

COMMENT ON TABLE crm.leads IS
  'E13-S09: lead de pre-venda. Admin-only por natureza — lead nao tem login, e todo acesso passa '
  'pelo painel. Vira cliente em crm.clientes, e a ligacao fica em clientes.lead_origem_id.';

-- O kanban lista por estagio; e o unico filtro de coluna que existe na tela.
CREATE INDEX leads_estagio_idx ON crm.leads (estagio) WHERE deleted_at IS NULL;

-- A FK existia so na intencao: 0001 criou `lead_origem_id uuid` solto porque crm.leads ainda nao
-- existia. Agora fecha — sem isso, conversao pode gravar id de lead inexistente.
--
-- `NOT VALID` de proposito (apontado pelo Squawk): adicionar FK validando exige scan e um
-- SHARE ROW EXCLUSIVE nas DUAS tabelas, bloqueando escrita. Hoje `crm.clientes` tem 2 linhas e o
-- scan seria instantaneo, mas a migration e imutavel e vai reaplicar num banco que talvez nao
-- seja mais pequeno. A validacao vem em 0012, em transacao separada — `NOT VALID` ja passa a
-- valer para toda linha NOVA, que e o que importa aqui.
ALTER TABLE crm.clientes
  ADD CONSTRAINT clientes_lead_origem_fk
  FOREIGN KEY (lead_origem_id) REFERENCES crm.leads(id)
  NOT VALID;

ALTER TABLE crm.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.leads FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON crm.leads TO authenticated;

-- Mesmo padrao de comunicacao.regras_atendimento_ia (E13-S05): admin-only, ZERO policy de
-- cliente. Um cliente autenticado consultando esta tabela recebe `[]`, nao erro — o que nao
-- vaza nem a existencia da tabela.
CREATE POLICY "so_admin_ve_leads" ON crm.leads
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_cria_lead" ON crm.leads
  FOR INSERT WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_edita_lead" ON crm.leads
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- Sem policy de DELETE para ninguem: lead descartado vira estagio 'descartado' e, se for o caso,
-- `deleted_at`. Apagar a linha destruiria a base de reativacao (E11-S05) e a trilha de auditoria.

CREATE TRIGGER audit_crm_leads AFTER INSERT OR UPDATE OR DELETE ON crm.leads
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
