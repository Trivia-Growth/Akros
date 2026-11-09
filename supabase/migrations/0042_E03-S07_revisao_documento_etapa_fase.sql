-- Description: RPCs transacionais da Edge Function `revisao-comandos` (E03-S07, Fase 6/US3,
--              design-tecnico.md Sec2). Mesmo template SECURITY DEFINER de 0022/0024/0027 (guarda
--              service_role primeiro, so DEPOIS set_config com o autor real). `revisao-comandos`
--              e admin-only (requireAdmin na Edge Function, mesmo criterio de caso-comandos) -- as
--              RPCs abaixo nao reverificam papel internamente, so a guarda de service_role.
--
--              `documentos.revisar_documento` -- documento em 'em_analise' decide para 'aprovado'
--              ou 'ajustes' (motivo obrigatorio); grava `documentos.decisoes_revisao`
--              (append-only, ja existe desde 0019) na MESMA transacao da mudanca de status.
--
--              `jornada.decidir_etapa` -- etapa em 'em_analise' decide para 'concluida' ou volta
--              para 'pendente' (motivo obrigatorio na devolucao). Documentos sao vinculados a
--              FASE, nao a etapa (documentos.documentos.fase_id, 0005) -- entao o requisito
--              obrigatorio de documento aprovado e checado em `liberar_fase`, nao aqui. Motivo de
--              devolucao de etapa e gravado em `crm.notas_internas` (admin-only, 0017): a tabela
--              `jornada.etapas` nao tem coluna propria para isto e criar uma so para um texto
--              opcional duplicaria o que notas_internas ja resolve.
--
--              `jornada.liberar_fase` -- fase 'bloqueada' vira 'liberada' (e jornada.fase_atual_id
--              acompanha, mesmo efeito do mock `useMockDb.liberarFase`). Antes de liberar, exige
--              que a fase anterior (ordem - 1) esteja 'concluida' (sem isso, 409 "fora de ordem")
--              e que todo documento dessa fase anterior estratra em deja 'aprovado' (sem isso, 422
--              "requisito obrigatorio pendente") -- sem override no MVP (design-tecnico.md Sec2).
--              Fase de ordem 0 (Introducao) nao tem fase anterior: libera direto.
-- Story: E03-S07
-- Created: 2026-11-05

-- Rollback:
--   DROP FUNCTION IF EXISTS jornada.liberar_fase(uuid, integer, uuid);
--   DROP FUNCTION IF EXISTS jornada.decidir_etapa(uuid, text, text, integer, uuid);
--   DROP FUNCTION IF EXISTS documentos.revisar_documento(uuid, uuid, text, text, integer, uuid);

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- documentos.revisar_documento
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION documentos.revisar_documento(
  p_documento_id uuid,
  p_versao_id uuid,
  p_decisao text,
  p_justificativa text,
  p_revisao_esperada integer,
  p_autor_id uuid
)
RETURNS documentos.documentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = documentos, pg_temp
AS $$
DECLARE
  v_documento documentos.documentos%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'revisão de documento negada' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;
  IF p_decisao NOT IN ('aprovado', 'ajustes') THEN
    RAISE EXCEPTION 'decisão inválida' USING ERRCODE = '22023';
  END IF;
  IF p_decisao = 'ajustes' AND (p_justificativa IS NULL OR btrim(p_justificativa) = '') THEN
    RAISE EXCEPTION 'justificativa obrigatória para devolver com ajustes' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  SELECT * INTO v_documento FROM documentos.documentos WHERE id = p_documento_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'documento não encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF v_documento.status <> 'em_analise' THEN
    RAISE EXCEPTION 'documento não está em análise' USING ERRCODE = '55000';
  END IF;

  IF v_documento.revisao <> p_revisao_esperada THEN
    RAISE EXCEPTION 'revisao esperada nao corresponde a atual (%)', v_documento.revisao
      USING ERRCODE = '40001';
  END IF;

  INSERT INTO documentos.decisoes_revisao (
    documento_id, versao_id, decisao, justificativa, decidido_por
  ) VALUES (
    p_documento_id, p_versao_id, p_decisao, p_justificativa, p_autor_id
  );

  -- Mantém o jsonb legado `documentos.documentos.decisao` (ADR-0010, lido hoje por
  -- DocumentosRealPage.tsx no portal do cliente) em sincronia com o registro append-only acima —
  -- a fonte de verdade auditável é `decisoes_revisao`, este jsonb é só a última leitura rápida
  -- sem join. `autor` genérico (equipe, não nome individual): não há tabela de nomes de equipe
  -- acessível aqui, e o autor real/auditável já está em `decisoes_revisao.decidido_por`.
  UPDATE documentos.documentos
  SET status = p_decisao,
      revisao = revisao + 1,
      updated_at = now(),
      decisao = jsonb_build_object(
        'decisao', p_decisao,
        'autor', 'Equipe Akros',
        'decididoEm', now(),
        'concordouComIA', true
      ) || CASE WHEN p_justificativa IS NOT NULL
             THEN jsonb_build_object('motivoAjuste', p_justificativa)
             ELSE '{}'::jsonb
           END
  WHERE id = p_documento_id
  RETURNING * INTO v_documento;

  RETURN v_documento;
END;
$$;

REVOKE ALL ON FUNCTION documentos.revisar_documento(uuid, uuid, text, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION documentos.revisar_documento(uuid, uuid, text, text, integer, uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- jornada.decidir_etapa
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION jornada.decidir_etapa(
  p_etapa_id uuid,
  p_decisao text,
  p_motivo text,
  p_revisao_esperada integer,
  p_autor_id uuid
)
RETURNS jornada.etapas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jornada, crm, pg_temp
AS $$
DECLARE
  v_etapa jornada.etapas%ROWTYPE;
  v_cliente_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'decisão de etapa negada' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;
  IF p_decisao NOT IN ('concluida', 'pendente') THEN
    RAISE EXCEPTION 'decisão inválida' USING ERRCODE = '22023';
  END IF;
  IF p_decisao = 'pendente' AND (p_motivo IS NULL OR btrim(p_motivo) = '') THEN
    RAISE EXCEPTION 'motivo obrigatório para devolver a etapa' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  SELECT j.cliente_id INTO v_cliente_id
  FROM jornada.etapas e
  JOIN jornada.fases f ON f.id = e.fase_id
  JOIN jornada.jornadas j ON j.id = f.jornada_id
  WHERE e.id = p_etapa_id
  FOR UPDATE OF e;

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'etapa não encontrada' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_etapa FROM jornada.etapas WHERE id = p_etapa_id;

  IF v_etapa.status <> 'em_analise' THEN
    RAISE EXCEPTION 'etapa não está em análise' USING ERRCODE = '55000';
  END IF;

  IF v_etapa.revisao <> p_revisao_esperada THEN
    RAISE EXCEPTION 'revisao esperada nao corresponde a atual (%)', v_etapa.revisao
      USING ERRCODE = '40001';
  END IF;

  IF p_decisao = 'pendente' THEN
    INSERT INTO crm.notas_internas (cliente_id, conteudo, autor_id)
    VALUES (v_cliente_id, 'Etapa devolvida: ' || p_motivo, p_autor_id);
  END IF;

  UPDATE jornada.etapas
  SET status = p_decisao, revisao = revisao + 1, updated_at = now()
  WHERE id = p_etapa_id
  RETURNING * INTO v_etapa;

  RETURN v_etapa;
END;
$$;

REVOKE ALL ON FUNCTION jornada.decidir_etapa(uuid, text, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION jornada.decidir_etapa(uuid, text, text, integer, uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- jornada.liberar_fase
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION jornada.liberar_fase(
  p_fase_id uuid,
  p_revisao_esperada integer,
  p_autor_id uuid
)
RETURNS jornada.fases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jornada, documentos, pg_temp
AS $$
DECLARE
  v_fase jornada.fases%ROWTYPE;
  v_fase_anterior jornada.fases%ROWTYPE;
  v_pendentes integer;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'liberação de fase negada' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  SELECT * INTO v_fase FROM jornada.fases WHERE id = p_fase_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fase não encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF v_fase.status <> 'bloqueada' THEN
    RAISE EXCEPTION 'fase não está bloqueada' USING ERRCODE = '55000';
  END IF;

  IF v_fase.revisao <> p_revisao_esperada THEN
    RAISE EXCEPTION 'revisao esperada nao corresponde a atual (%)', v_fase.revisao
      USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_fase_anterior
  FROM jornada.fases
  WHERE jornada_id = v_fase.jornada_id AND ordem = v_fase.ordem - 1;

  IF FOUND THEN
    IF v_fase_anterior.status <> 'concluida' THEN
      RAISE EXCEPTION 'fase anterior ainda não concluída' USING ERRCODE = '40001';
    END IF;

    SELECT count(*) INTO v_pendentes
    FROM documentos.documentos
    WHERE fase_id = v_fase_anterior.id AND status <> 'aprovado';

    IF v_pendentes > 0 THEN
      RAISE EXCEPTION 'há % documento(s) da fase anterior sem aprovação', v_pendentes
        USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE jornada.fases
  SET status = 'liberada', revisao = revisao + 1, updated_at = now()
  WHERE id = p_fase_id
  RETURNING * INTO v_fase;

  UPDATE jornada.jornadas
  SET fase_atual_id = p_fase_id
  WHERE id = v_fase.jornada_id;

  RETURN v_fase;
END;
$$;

REVOKE ALL ON FUNCTION jornada.liberar_fase(uuid, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION jornada.liberar_fase(uuid, integer, uuid) TO service_role;
