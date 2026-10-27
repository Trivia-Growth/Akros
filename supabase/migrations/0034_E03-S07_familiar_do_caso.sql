-- Description: Recusa documento ou participante associado a familiar de outro caso.
-- Story: E03-S07
-- Rollback: aplicar supabase/rollback/0034_E03-S07_familiar_do_caso.sql.

CREATE FUNCTION crm.familiar_pertence_ao_caso(p_cliente_id uuid, p_familiar_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = crm, pg_temp AS $$
DECLARE v_perfil jsonb;
BEGIN
  SELECT perfil_imigratorio INTO v_perfil FROM crm.clientes WHERE id = p_cliente_id FOR SHARE;
  IF NOT FOUND OR jsonb_typeof(v_perfil -> 'familiares') IS DISTINCT FROM 'array' THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM jsonb_array_elements(v_perfil -> 'familiares') familiar
                 WHERE familiar ->> 'id' = p_familiar_id);
END;
$$;
REVOKE ALL ON FUNCTION crm.familiar_pertence_ao_caso(uuid, text) FROM PUBLIC;

CREATE FUNCTION crm.validar_familiar_documento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = crm, pg_temp AS $$
BEGIN
  IF NEW.sujeito_tipo = 'familiar' AND NOT crm.familiar_pertence_ao_caso(NEW.cliente_id, NEW.sujeito_familiar_id) THEN
    RAISE EXCEPTION 'familiar nao pertence ao caso' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION crm.validar_familiar_documento() FROM PUBLIC;

CREATE FUNCTION crm.validar_familiar_participante()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = crm, pg_temp AS $$
BEGIN
  IF NEW.sujeito_tipo = 'familiar' AND NOT crm.familiar_pertence_ao_caso(NEW.cliente_id, NEW.familiar_id) THEN
    RAISE EXCEPTION 'familiar nao pertence ao caso' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION crm.validar_familiar_participante() FROM PUBLIC;

CREATE TRIGGER documento_familiar_do_caso
BEFORE INSERT OR UPDATE OF cliente_id, sujeito_tipo, sujeito_familiar_id ON documentos.documentos
FOR EACH ROW EXECUTE FUNCTION crm.validar_familiar_documento();

CREATE TRIGGER participante_familiar_do_caso
BEFORE INSERT OR UPDATE OF cliente_id, sujeito_tipo, familiar_id ON crm.participantes
FOR EACH ROW EXECUTE FUNCTION crm.validar_familiar_participante();
