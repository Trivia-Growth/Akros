-- Description: Impede exclusão direta de metadados do Storage; limpeza usa a API.
-- Story: E03-S07
-- Rollback: aplicar supabase/rollback/0036_E03-S07_limpeza_storage.sql; reverte segurança.

CREATE OR REPLACE FUNCTION arquivos.limpar_temporarios_confirmados()
RETURNS integer LANGUAGE plpgsql SET search_path = arquivos, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'limpeza deve usar a API do Storage' USING ERRCODE = '0A000';
END;
$$;
