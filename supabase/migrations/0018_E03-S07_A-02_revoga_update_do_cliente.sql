-- Description: Fecha A-02 — revoga UPDATE direto (cliente e admin) em documentos.documentos,
--   pagamentos.pagamentos e jornada.etapas. Hoje o predicado das policies de UPDATE valida só
--   propriedade (cliente_id = crm.meu_cliente_id()), não qual transição de status é permitida —
--   um cliente autenticado pode hoje aprovar o próprio documento ou marcar o próprio pagamento
--   como pago direto pelo PostgREST. Depois desta migration, nenhum papel escreve estas 3 tabelas
--   por UPDATE direto; toda escrita passa a depender de Edge Function com service_role (fora de
--   escopo aqui). jornada.jornadas e jornada.fases já não tinham policy de UPDATE (só GRANT), mas
--   o GRANT também é revogado aqui para fechar o gap por completo. SELECT não é afetado.
--   pagamentos.dados_recebimento é dado bancário da Akros (não é dado de cliente) e está fora de
--   escopo de A-02 — sua policy so_admin_atualiza_dados_recebimento permanece intocada.
-- Story: E03-S07
-- Created: 2026-10-11
-- Rollback:
--   CREATE POLICY "admin_atualiza_qualquer_documento" ON documentos.documentos
--     FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
--   CREATE POLICY "cliente_atualiza_o_proprio_documento" ON documentos.documentos
--     FOR UPDATE USING (cliente_id = crm.meu_cliente_id());
--   CREATE POLICY "admin_atualiza_qualquer_pagamento" ON pagamentos.pagamentos
--     FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
--   CREATE POLICY "cliente_atualiza_o_proprio_pagamento" ON pagamentos.pagamentos
--     FOR UPDATE USING (cliente_id = crm.meu_cliente_id());
--   CREATE POLICY "admin_atualiza_qualquer_etapa" ON jornada.etapas
--     FOR UPDATE
--     USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
--   CREATE POLICY "cliente_atualiza_etapa_da_propria_jornada" ON jornada.etapas
--     FOR UPDATE
--     USING (
--       fase_id IN (
--         SELECT f.id FROM jornada.fases f
--         JOIN jornada.jornadas j ON j.id = f.jornada_id
--         WHERE j.cliente_id = crm.meu_cliente_id()
--       )
--     );
--   GRANT UPDATE ON documentos.documentos TO authenticated;
--   GRANT UPDATE ON pagamentos.pagamentos TO authenticated;
--   GRANT UPDATE ON jornada.jornadas, jornada.fases, jornada.etapas TO authenticated;

DROP POLICY "admin_atualiza_qualquer_documento" ON documentos.documentos;
DROP POLICY "cliente_atualiza_o_proprio_documento" ON documentos.documentos;
DROP POLICY "admin_atualiza_qualquer_pagamento" ON pagamentos.pagamentos;
DROP POLICY "cliente_atualiza_o_proprio_pagamento" ON pagamentos.pagamentos;
DROP POLICY "admin_atualiza_qualquer_etapa" ON jornada.etapas;
DROP POLICY "cliente_atualiza_etapa_da_propria_jornada" ON jornada.etapas;

REVOKE UPDATE ON documentos.documentos FROM authenticated;
REVOKE UPDATE ON pagamentos.pagamentos FROM authenticated;
REVOKE UPDATE ON jornada.jornadas, jornada.fases, jornada.etapas FROM authenticated;
