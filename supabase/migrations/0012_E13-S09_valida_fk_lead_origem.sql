-- Description: Valida a FK crm.clientes.lead_origem_id criada como NOT VALID em 0011.
--              Transacao separada de proposito: e o que evita segurar SHARE ROW EXCLUSIVE nas
--              duas tabelas durante a criacao (padrao apontado pelo Squawk).
-- Story: E13-S09
-- Created: 2026-08-31

-- Rollback: nao aplicavel — VALIDATE nao muda dado nem estrutura, so promove a constraint a
--           verificada. Reverter e o DROP CONSTRAINT da 0011.

ALTER TABLE crm.clientes VALIDATE CONSTRAINT clientes_lead_origem_fk;
