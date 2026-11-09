-- Description: RPCs transacionais de US4 (E03-S07, Fase 7, design-tecnico.md §2):
--              `crm.cadastrar_cobranca` (chamada por `caso-comandos`) e
--              `pagamentos.conciliar_pagamento` (chamada por `revisao-comandos`). Mesmo template
--              SECURITY DEFINER de 0022/0024/0027/0042 (guarda service_role primeiro, só DEPOIS
--              set_config com o autor real). Ambas são admin-only — a Edge Function já garante
--              isso via `requireAdmin`, as RPCs não reverificam papel.
--
--              `cadastrar_cobranca` recusa cobrança sem condição contratual correspondente (FK +
--              checagem explícita, 422) e recusa duplicar cobrança para a mesma condição (409).
--              Condição do tipo 'outro' não tem valor correspondente em
--              `pagamentos.pagamentos.tipo` (CHECK não inclui 'outro', 0005) — recusada com 422
--              em vez de deixar o INSERT estourar o CHECK do banco sem contexto.
--
--              `conciliar_pagamento`: pago ou divergente, sempre com valor recebido; divergência
--              exige motivo (mesma regra de `revisar_documento`/0042). Só a partir de
--              'em_conferencia' (comprovante já recebido) — nunca de 'pendente' direto, e nunca
--              aceita re-conciliar um pagamento já decidido sem passar de novo por
--              'em_conferencia' (reenvio de comprovante).
--
--              `arquivos.finalizar_envio` (0027) só atualizava `documentos.documentos` quando o
--              envio era de documento — pagamento nunca saía de 'pendente'/'atrasado' ao receber
--              comprovante. `CREATE OR REPLACE` aqui acrescenta o branch de pagamento: vira
--              'em_conferencia' com `comprovante_versao_id`/`anexado_em` — NUNCA 'pago' (comprovante
--              não leva a pago sozinho, só a conferência humana via `conciliar_pagamento` leva).
-- Story: E03-S07
-- Created: 2026-11-05

-- Rollback:
--   DROP FUNCTION IF EXISTS pagamentos.conciliar_pagamento(uuid, text, numeric, text, integer, uuid);
--   DROP FUNCTION IF EXISTS crm.cadastrar_cobranca(uuid, uuid);
--   (arquivos.finalizar_envio volta à forma de 0027 — remover o branch de pagamento abaixo)

CREATE OR REPLACE FUNCTION crm.cadastrar_cobranca(
  p_contrato_condicao_id uuid,
  p_autor_id uuid
)
RETURNS pagamentos.pagamentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, pagamentos, pg_temp
AS $$
DECLARE
  v_condicao crm.contrato_condicoes%ROWTYPE;
  v_contrato crm.contratos%ROWTYPE;
  v_pagamento pagamentos.pagamentos%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'cadastro de cobrança negado' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_condicao FROM crm.contrato_condicoes WHERE id = p_contrato_condicao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'condição contratual não encontrada' USING ERRCODE = '22023';
  END IF;

  IF v_condicao.tipo = 'outro' THEN
    RAISE EXCEPTION 'condição do tipo "outro" não gera cobrança automática' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pagamentos.pagamentos WHERE contrato_condicao_id = p_contrato_condicao_id
  ) THEN
    RAISE EXCEPTION 'já existe cobrança para esta condição contratual' USING ERRCODE = '23505';
  END IF;

  SELECT * INTO v_contrato FROM crm.contratos WHERE id = v_condicao.contrato_id;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  INSERT INTO pagamentos.pagamentos (
    cliente_id, descricao, valor, moeda, status, vencimento, tipo, contrato_condicao_id
  ) VALUES (
    v_contrato.cliente_id, v_condicao.descricao, v_condicao.valor, v_condicao.moeda,
    'pendente', v_condicao.vencimento, v_condicao.tipo, p_contrato_condicao_id
  )
  RETURNING * INTO v_pagamento;

  RETURN v_pagamento;
END;
$$;

REVOKE ALL ON FUNCTION crm.cadastrar_cobranca(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.cadastrar_cobranca(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION pagamentos.conciliar_pagamento(
  p_pagamento_id uuid,
  p_decisao text,
  p_valor_recebido numeric,
  p_motivo_divergencia text,
  p_revisao_esperada integer,
  p_autor_id uuid
)
RETURNS pagamentos.pagamentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pagamentos, pg_temp
AS $$
DECLARE
  v_pagamento pagamentos.pagamentos%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'conciliação negada' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;
  IF p_decisao NOT IN ('pago', 'divergente') THEN
    RAISE EXCEPTION 'decisão inválida' USING ERRCODE = '22023';
  END IF;
  IF p_valor_recebido IS NULL OR p_valor_recebido <= 0 THEN
    RAISE EXCEPTION 'valor recebido inválido' USING ERRCODE = '22023';
  END IF;
  IF p_decisao = 'divergente' AND (p_motivo_divergencia IS NULL OR btrim(p_motivo_divergencia) = '') THEN
    RAISE EXCEPTION 'motivo obrigatório para divergência' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  SELECT * INTO v_pagamento FROM pagamentos.pagamentos WHERE id = p_pagamento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'pagamento não encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF v_pagamento.status <> 'em_conferencia' THEN
    RAISE EXCEPTION 'pagamento não está em conferência' USING ERRCODE = '55000';
  END IF;

  IF v_pagamento.revisao <> p_revisao_esperada THEN
    RAISE EXCEPTION 'revisao esperada nao corresponde a atual (%)', v_pagamento.revisao
      USING ERRCODE = '40001';
  END IF;

  UPDATE pagamentos.pagamentos
  SET status = p_decisao,
      valor_recebido = p_valor_recebido,
      motivo_divergencia = CASE WHEN p_decisao = 'divergente' THEN p_motivo_divergencia ELSE NULL END,
      confirmado_por_id = p_autor_id,
      pago_em = CASE WHEN p_decisao = 'pago' THEN now() ELSE pago_em END,
      revisao = revisao + 1,
      updated_at = now()
  WHERE id = p_pagamento_id
  RETURNING * INTO v_pagamento;

  RETURN v_pagamento;
END;
$$;

REVOKE ALL ON FUNCTION pagamentos.conciliar_pagamento(uuid, text, numeric, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pagamentos.conciliar_pagamento(uuid, text, numeric, text, integer, uuid)
  TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- arquivos.finalizar_envio — acrescenta o branch de pagamento (0027 só tratava documento).
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION arquivos.finalizar_envio(
  p_versao_id uuid,
  p_revisao_esperada integer,
  p_autor_id uuid
)
RETURNS arquivos.versoes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = arquivos, documentos, pagamentos, pg_temp
AS $$
DECLARE
  v_versao  arquivos.versoes%ROWTYPE;
  v_reserva arquivos.reservas_envio%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'finalizacao de envio negada' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  SELECT * INTO v_versao FROM arquivos.versoes WHERE id = p_versao_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'versao nao encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF v_versao.estado_recebimento <> 'reservada' THEN
    RAISE EXCEPTION 'versao nao esta mais reservada' USING ERRCODE = '55000';
  END IF;

  IF v_versao.revisao <> p_revisao_esperada THEN
    RAISE EXCEPTION 'revisao esperada nao corresponde a atual (%)' , v_versao.revisao
      USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_reserva FROM arquivos.reservas_envio WHERE versao_id = p_versao_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reserva nao encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF v_reserva.expira_em <= now() THEN
    RAISE EXCEPTION 'reserva expirada' USING ERRCODE = '55000';
  END IF;

  UPDATE arquivos.versoes
  SET estado_recebimento = 'recebida', recebido_em = now(), revisao = revisao + 1
  WHERE id = p_versao_id
  RETURNING * INTO v_versao;

  IF v_versao.documento_id IS NOT NULL THEN
    UPDATE documentos.documentos
    SET status = 'enviado', enviado_em = now(), revisao = revisao + 1, updated_at = now()
    WHERE id = v_versao.documento_id;
  END IF;

  -- Comprovante de pagamento: vira 'em_conferencia', NUNCA 'pago' — só `conciliar_pagamento`
  -- (decisão humana) leva a 'pago' (design-tecnico.md §1.6/§2, "comprovante não leva a pago").
  IF v_versao.pagamento_id IS NOT NULL THEN
    UPDATE pagamentos.pagamentos
    SET status = 'em_conferencia',
        comprovante_versao_id = p_versao_id,
        anexado_em = now(),
        revisao = revisao + 1,
        updated_at = now()
    WHERE id = v_versao.pagamento_id;
  END IF;

  INSERT INTO arquivos.trabalhos_transferencia (versao_id, estado) VALUES (p_versao_id, 'pendente');

  RETURN v_versao;
END;
$$;

REVOKE ALL ON FUNCTION arquivos.finalizar_envio(uuid, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION arquivos.finalizar_envio(uuid, integer, uuid) TO service_role;
