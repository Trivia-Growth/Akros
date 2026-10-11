-- Description: Liga pagamentos.pagamentos ao contrato de origem (design-tecnico.md Sec1.5):
--              contrato_condicao_id aponta para a condicao de contrato (crm.contrato_condicoes,
--              0017) que originou a cobranca; comprovante_versao_id aponta para o arquivo
--              recebido via OneDrive (arquivos.versoes, 0020) que serve de comprovante novo;
--              motivo_divergencia e confirmado_por_id suportam o fluxo de conferencia manual do
--              admin; revisao e trava de revisao otimista (concorrencia entre admin e cliente).
--              comprovante_url (text, legado de 0005) permanece intocada na tabela -- so leitura
--              de historico a partir de agora, nenhuma escrita nova nela; isso e regra de
--              aplicacao (Edge Function), nao de schema, por isso nao ha ALTER/DROP aqui.
--              Corrige tambem a visibilidade de participante em pagamentos.pagamentos para o
--              modelo novo de papeis (crm.meus_casos(), 0017): a policy de SELECT do
--              cliente/participante ainda estava em "cliente_id = crm.meu_cliente_id()" (vinculo
--              legado mono-titular, 0005), igual ao que 0019/0020 ja corrigiram para
--              documentos/jornada/arquivos. A policy de admin nao e tocada. A policy de UPDATE
--              ja foi removida em 0018 (A-02) e nao e recriada aqui.
-- Story: E03-S07
-- Created: 2026-10-11

-- Rollback:
--   DROP POLICY IF EXISTS "participante_ve_pagamentos_do_caso" ON pagamentos.pagamentos;
--   CREATE POLICY "cliente_ve_os_proprios_pagamentos" ON pagamentos.pagamentos
--     FOR SELECT USING (cliente_id = crm.meu_cliente_id());
--   ALTER TABLE pagamentos.pagamentos
--     DROP COLUMN IF EXISTS revisao,
--     DROP COLUMN IF EXISTS confirmado_por_id,
--     DROP COLUMN IF EXISTS motivo_divergencia,
--     DROP COLUMN IF EXISTS comprovante_versao_id,
--     DROP COLUMN IF EXISTS contrato_condicao_id;

ALTER TABLE pagamentos.pagamentos
  ADD COLUMN contrato_condicao_id uuid,
  ADD COLUMN comprovante_versao_id uuid,
  ADD COLUMN motivo_divergencia text,
  ADD COLUMN confirmado_por_id uuid,
  ADD COLUMN revisao integer NOT NULL DEFAULT 1;

-- `NOT VALID` de proposito (mesmo criterio apontado pelo Squawk e ja usado em 0019/0020): FK
-- validando de cara exige scan + SHARE ROW EXCLUSIVE nas duas tabelas. `NOT VALID` ja vale pra
-- toda linha nova; a migration e imutavel e pode reaplicar num banco maior no futuro. Sem
-- VALIDATE CONSTRAINT de seguimento nesta story -- fora de escopo de T019.
ALTER TABLE pagamentos.pagamentos
  ADD CONSTRAINT pagamentos_contrato_condicao_fk FOREIGN KEY (contrato_condicao_id)
    REFERENCES crm.contrato_condicoes(id) NOT VALID;

ALTER TABLE pagamentos.pagamentos
  ADD CONSTRAINT pagamentos_comprovante_versao_fk FOREIGN KEY (comprovante_versao_id)
    REFERENCES arquivos.versoes(id) NOT VALID;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- Policy de SELECT por participacao -- substitui a policy de cliente de 0005. A policy de admin
-- ("admin_ve_todos_pagamentos") nao e tocada. Sem GRANT novo: GRANT SELECT, UPDATE ON
-- pagamentos.pagamentos TO authenticated (0005) ja cobre a leitura desta policy.
-- ─────────────────────────────────────────────────────────────────────────────────────────────

DROP POLICY "cliente_ve_os_proprios_pagamentos" ON pagamentos.pagamentos;

CREATE POLICY "participante_ve_pagamentos_do_caso" ON pagamentos.pagamentos
  FOR SELECT USING (
    cliente_id IN (SELECT crm.meus_casos())
  );
