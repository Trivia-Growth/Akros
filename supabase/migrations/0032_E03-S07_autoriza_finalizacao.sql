-- Description: Revalida proprietário e acesso antes de finalizar ou repetir envio.
-- Story: E03-S07
-- Rollback: aplicar supabase/rollback/0032_E03-S07_autoriza_finalizacao.sql.
--           Atenção: o rollback reverte correção de segurança.

CREATE FUNCTION arquivos.autorizar_finalizacao(p_versao_id uuid, p_autor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = arquivos, crm, documentos, auth, pg_temp
AS $$
DECLARE
  v_versao arquivos.versoes%ROWTYPE;
  v_criada_por uuid;
  v_admin boolean := false;
  v_participa boolean := false;
  v_documento documentos.documentos%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' OR p_autor_id IS NULL THEN
    RAISE EXCEPTION 'finalizacao negada' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text, true);
  SELECT * INTO v_versao FROM arquivos.versoes WHERE id = p_versao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'versao nao encontrada' USING ERRCODE = 'P0002';
  END IF;
  SELECT criada_por INTO v_criada_por FROM arquivos.reservas_envio WHERE versao_id = p_versao_id;
  IF NOT FOUND OR v_criada_por IS DISTINCT FROM p_autor_id THEN
    RAISE EXCEPTION 'versao nao encontrada' USING ERRCODE = 'P0002';
  END IF;
  SELECT coalesce(raw_app_meta_data ->> 'role' = 'admin', false) INTO v_admin
  FROM auth.users WHERE id = p_autor_id FOR SHARE;
  v_admin := coalesce(v_admin, false);
  IF NOT v_admin THEN
    PERFORM 1 FROM crm.participantes
    WHERE cliente_id = v_versao.cliente_id AND auth_user_id = p_autor_id AND estado = 'ativo'
    FOR SHARE;
    v_participa := FOUND;
    IF NOT v_participa AND NOT EXISTS (
      SELECT 1 FROM crm.participantes WHERE cliente_id = v_versao.cliente_id AND auth_user_id = p_autor_id
    ) THEN
      PERFORM 1 FROM crm.clientes
      WHERE id = v_versao.cliente_id AND auth_user_id = p_autor_id AND deleted_at IS NULL FOR SHARE;
      v_participa := FOUND;
    END IF;
    IF NOT v_participa THEN
      RAISE EXCEPTION 'versao nao encontrada' USING ERRCODE = 'P0002';
    END IF;
    IF v_versao.documento_id IS NOT NULL THEN
      SELECT * INTO v_documento FROM documentos.documentos WHERE id = v_versao.documento_id;
      IF NOT FOUND OR (v_documento.fase_id IS NOT NULL AND NOT documentos.fase_liberada_para_portal(v_documento.fase_id)) THEN
        RAISE EXCEPTION 'versao nao encontrada' USING ERRCODE = 'P0002';
      END IF;
      IF v_documento.restrito_ao_papel AND (v_documento.papel_dirigido IS NULL OR NOT crm.tenho_papel(v_versao.cliente_id, v_documento.papel_dirigido)) THEN
        RAISE EXCEPTION 'versao nao encontrada' USING ERRCODE = 'P0002';
      END IF;
      IF NOT (v_documento.envio_conjunto OR (v_documento.papel_dirigido IS NULL AND NOT v_documento.restrito_ao_papel)
        OR (v_documento.papel_dirigido IS NOT NULL AND crm.tenho_papel(v_versao.cliente_id, v_documento.papel_dirigido))) THEN
        RAISE EXCEPTION 'versao nao encontrada' USING ERRCODE = 'P0002';
      END IF;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION arquivos.autorizar_finalizacao(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION arquivos.autorizar_finalizacao(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION arquivos.finalizar_envio(
  p_versao_id uuid,
  p_revisao_esperada integer,
  p_autor_id uuid
)
RETURNS arquivos.versoes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = arquivos, documentos, pg_temp
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

  PERFORM arquivos.autorizar_finalizacao(p_versao_id, p_autor_id);

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

  INSERT INTO arquivos.trabalhos_transferencia (versao_id, estado) VALUES (p_versao_id, 'pendente');

  RETURN v_versao;
END;
$$;

REVOKE ALL ON FUNCTION arquivos.finalizar_envio(uuid, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION arquivos.finalizar_envio(uuid, integer, uuid) TO service_role;
