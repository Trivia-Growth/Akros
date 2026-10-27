-- Restaura limpeza anterior por SQL, que deixa objetos órfãos.
CREATE OR REPLACE FUNCTION arquivos.limpar_temporarios_confirmados()
RETURNS integer
LANGUAGE plpgsql
SET search_path = arquivos, storage, pg_temp
AS $$
DECLARE
  v_qtd integer;
BEGIN
  WITH alvo AS (
    SELECT v.id, v.objeto_temporario
    FROM arquivos.versoes v
    WHERE v.estado_armazenamento = 'armazenado'
      AND v.item_id IS NOT NULL
      AND v.objeto_temporario IS NOT NULL
  ),
  removidos AS (
    DELETE FROM storage.objects o
    USING alvo
    WHERE o.bucket_id = 'envios' AND o.name = alvo.objeto_temporario
    RETURNING alvo.id
  )
  UPDATE arquivos.versoes v
  SET objeto_temporario = NULL
  FROM removidos r
  WHERE v.id = r.id;
  GET DIAGNOSTICS v_qtd = ROW_COUNT;
  RETURN v_qtd;
END;
$$;

REVOKE ALL ON FUNCTION arquivos.limpar_temporarios_confirmados() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION arquivos.limpar_temporarios_confirmados() TO service_role;
