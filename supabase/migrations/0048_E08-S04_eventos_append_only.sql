-- Description: E08-S04 — torna `comunicacao.eventos` genuinamente append-only. 0007 criou a
--              tabela com `GRANT ALL ON ALL TABLES IN SCHEMA comunicacao TO service_role`, que
--              inclui UPDATE/DELETE — nada impedia (estruturalmente) apagar um evento, mesmo que
--              nenhum código do app fizesse isso hoje. Mesmo critério de `audit.eventos` (0008):
--              append-only é garantia de GRANT, não de policy — `service_role` tem BYPASSRLS, FORCE
--              não o alcança. Prova pedida pelo Bruno (carta de 2026-10-06): mesmo que o cliente
--              apague a mensagem no WhatsApp, o registro na Akros fica — isso só é verdade de
--              verdade se nem o `service_role` puder apagar.
-- Story: E08-S04
-- Created: 2026-11-06

-- Rollback:
--   GRANT UPDATE, DELETE ON comunicacao.eventos TO service_role;

REVOKE UPDATE, DELETE ON comunicacao.eventos FROM service_role;
-- INSERT/SELECT continuam concedidos (herdados do GRANT ALL original, agora restrito por esta
-- revogação pontual) — service_role registra evento novo, nunca modifica/apaga um existente.
