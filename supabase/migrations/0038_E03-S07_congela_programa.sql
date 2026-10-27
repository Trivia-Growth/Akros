-- Description: Impede alterar regras de uma versão já usada por contratos ou jornadas.
-- Story: E03-S07
-- Rollback: aplicar supabase/rollback/0038_E03-S07_congela_programa.sql.

CREATE FUNCTION programas.proteger_versao_em_uso()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = programas, crm, jornada, pg_temp AS $$
BEGIN
  IF (
    NEW.codigo IS DISTINCT FROM OLD.codigo OR NEW.versao IS DISTINCT FROM OLD.versao
    OR NEW.categoria IS DISTINCT FROM OLD.categoria OR NEW.sujeito IS DISTINCT FROM OLD.sujeito
    OR NEW.fases_template IS DISTINCT FROM OLD.fases_template
    OR NEW.documentos_exigidos IS DISTINCT FROM OLD.documentos_exigidos
    OR NEW.papeis IS DISTINCT FROM OLD.papeis
  ) AND (
    EXISTS (SELECT 1 FROM crm.contratos c WHERE c.programa_id = OLD.codigo AND c.programa_versao = OLD.versao)
    OR EXISTS (SELECT 1 FROM jornada.jornadas j WHERE j.programa_id = OLD.codigo AND j.programa_versao = OLD.versao)
  ) THEN
    RAISE EXCEPTION 'versao do programa em uso; duplique o programa para alterar regras'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION programas.proteger_versao_em_uso() FROM PUBLIC;

CREATE TRIGGER programa_versao_em_uso
BEFORE UPDATE ON programas.programas
FOR EACH ROW EXECUTE FUNCTION programas.proteger_versao_em_uso();
