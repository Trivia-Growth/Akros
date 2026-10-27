-- Description: Preserva a RPC legada e permite registrar origem da situação inicial.
-- Story: E03-S07
-- Rollback: DROP FUNCTION IF EXISTS crm.preparar_caso_com_origem(uuid, uuid, text, uuid, text);

CREATE FUNCTION crm.preparar_caso_com_origem(
  p_cliente_id uuid,
  p_contrato_id uuid,
  p_levantamento_estado text,
  p_autor_id uuid,
  p_origem text
)
RETURNS jornada.jornadas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, jornada, pg_temp
AS $$
DECLARE
  v_jornada jornada.jornadas%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'preparacao de caso negada' USING ERRCODE = '42501';
  END IF;
  IF p_origem IS NULL OR p_origem NOT IN ('importado', 'nascido_na_plataforma') THEN
    RAISE EXCEPTION 'origem de caso inválida' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_jornada FROM crm.preparar_caso(
    p_cliente_id, p_contrato_id, p_levantamento_estado, p_autor_id
  );
  UPDATE jornada.jornadas SET origem_situacao_inicial = p_origem
  WHERE id = v_jornada.id
  RETURNING * INTO v_jornada;
  RETURN v_jornada;
END;
$$;

REVOKE ALL ON FUNCTION crm.preparar_caso_com_origem(uuid, uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.preparar_caso_com_origem(uuid, uuid, text, uuid, text) TO service_role;
