-- Description: Fecha AV-01, AV-02 e AV-03 da revisão adversarial do projeto (2026-10-28): o cliente
--   deixa de escrever dado operacional pelo PostgREST. Cliente e admin compartilham o role
--   `authenticated`; as policies de UPDATE do cliente só conferiam posse, sem restrição de coluna.
--   - AV-01: remove `cliente_atualiza_a_propria_linha` de crm.clientes. O cliente trocava
--     case_manager, tipo_visto, programa_id/programa_versao, deleted_at e telefone/email da própria
--     linha (telefone igual ao de outro cliente desliga o vínculo de conversa desse outro). O portal
--     só lê esta tabela; o único UPDATE da web é do repositório do admin.
--   - AV-02: remove `cliente_atualiza_a_propria_reuniao` de agenda.reunioes. O cliente mudava
--     horário, status e título da própria reunião. Nenhuma tela do portal escreve aqui; se o produto
--     quiser cancelar/reagendar pelo cliente, entra como RPC com regra própria.
--   - AV-03: o INSERT do cliente em lgpd.solicitacoes e lgpd.consentimentos passa a GRANT por
--     coluna. status, concluido_em, motivo_negacao (solicitações) e aceito_em, revogado_em
--     (consentimentos) são do servidor: o pedido nasce 'pendente' e o consentimento carrega a data
--     do servidor. O admin continua processando o pedido pelo UPDATE (policy própria).
--   Sem UPDATE de cliente, a tentativa afeta 0 linhas (RLS filtra) em vez de dar erro; o INSERT com
--   coluna do servidor falha com insufficient_privilege (42501).
-- Story: E13-S15
-- Created: 2026-10-29
-- Rollback:
--   CREATE POLICY "cliente_atualiza_a_propria_linha" ON crm.clientes
--     FOR UPDATE USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
--   CREATE POLICY "cliente_atualiza_a_propria_reuniao" ON agenda.reunioes
--     FOR UPDATE USING (cliente_id = crm.meu_cliente_id());
--   REVOKE INSERT ON lgpd.solicitacoes, lgpd.consentimentos FROM authenticated;
--   GRANT INSERT ON lgpd.solicitacoes, lgpd.consentimentos TO authenticated;

DROP POLICY "cliente_atualiza_a_propria_linha" ON crm.clientes;
DROP POLICY "cliente_atualiza_a_propria_reuniao" ON agenda.reunioes;

REVOKE INSERT ON lgpd.solicitacoes FROM authenticated;
REVOKE INSERT ON lgpd.consentimentos FROM authenticated;
GRANT INSERT (cliente_id, tipo) ON lgpd.solicitacoes TO authenticated;
GRANT INSERT (cliente_id, tipo, aceito) ON lgpd.consentimentos TO authenticated;
