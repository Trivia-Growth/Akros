-- Restaura implementação anterior e remove guarda (reverte segurança).
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
DROP FUNCTION IF EXISTS arquivos.autorizar_finalizacao(uuid, uuid);
