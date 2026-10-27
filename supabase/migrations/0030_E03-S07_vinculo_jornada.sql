-- Description: Recusa vínculo de pasta cuja jornada pertence a outro cliente.
-- Story: E03-S07
-- Rollback: DROP TRIGGER IF EXISTS vinculo_jornada_do_cliente ON arquivos.vinculos_pasta;
--           DROP FUNCTION IF EXISTS arquivos.validar_jornada_do_vinculo();

CREATE FUNCTION arquivos.validar_jornada_do_vinculo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jornada, pg_temp
AS $$
BEGIN
  IF NEW.jornada_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM jornada.jornadas j
    WHERE j.id = NEW.jornada_id AND j.cliente_id = NEW.cliente_id
  ) THEN
    RAISE EXCEPTION 'jornada não pertence ao cliente' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION arquivos.validar_jornada_do_vinculo() FROM PUBLIC;

CREATE TRIGGER vinculo_jornada_do_cliente
BEFORE INSERT OR UPDATE OF cliente_id, jornada_id ON arquivos.vinculos_pasta
FOR EACH ROW EXECUTE FUNCTION arquivos.validar_jornada_do_vinculo();
