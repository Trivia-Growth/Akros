-- Restaura autorização anterior e reverte correção de segurança.
CREATE OR REPLACE FUNCTION arquivos.reserva_ativa_para_objeto(p_nome_objeto text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = arquivos, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM arquivos.reservas_envio r
    JOIN arquivos.versoes v ON v.id = r.versao_id
    WHERE r.objeto_permitido = p_nome_objeto
      AND r.expira_em > now()
      AND r.criada_por = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION arquivos.reserva_ativa_para_objeto(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION arquivos.reserva_ativa_para_objeto(text) TO authenticated;
