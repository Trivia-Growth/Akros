-- Description: Conversao atomica de crm.leads em crm.clientes, restrita a admin.
-- Story: E13-S09
-- Created: 2026-09-04

-- Rollback: DROP FUNCTION IF EXISTS crm.criar_cliente_a_partir_de_lead(uuid, text);
--           DROP INDEX IF EXISTS crm.clientes_lead_origem_unico_idx;

-- Um lead gera no maximo um cliente. Alem de expressar a regra de negocio, o indice fecha a
-- corrida de dois admins convertendo o mesmo lead ao mesmo tempo.
CREATE UNIQUE INDEX clientes_lead_origem_unico_idx
  ON crm.clientes (lead_origem_id)
  WHERE lead_origem_id IS NOT NULL;

CREATE OR REPLACE FUNCTION crm.criar_cliente_a_partir_de_lead(
  p_lead_id uuid,
  p_programa_codigo text DEFAULT NULL
)
RETURNS SETOF crm.clientes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, pg_temp
AS $$
DECLARE
  v_cliente crm.clientes%ROWTYPE;
BEGIN
  -- SECURITY DEFINER existe para inserir em `clientes`, cuja RLS nao concede INSERT direto.
  -- A autorizacao precisa ser repetida aqui: sem esta guarda, EXECUTE seria elevacao de privilegio.
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    RAISE EXCEPTION 'apenas admin pode converter lead em cliente'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_programa_codigo IS NOT NULL AND btrim(p_programa_codigo) = '' THEN
    RAISE EXCEPTION 'programa vazio'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO crm.clientes (
    lead_origem_id,
    nome,
    email,
    telefone,
    tipo_visto,
    case_manager,
    programa_id,
    created_by,
    updated_by
  )
  SELECT
    l.id,
    l.nome,
    l.email,
    l.telefone,
    l.tipo_visto_interesse,
    -- Temporario ate E13-S10 tornar `configuracoes.equipe` a fonte real de atribuicao.
    'Natalia Luz',
    p_programa_codigo,
    auth.uid(),
    auth.uid()
  FROM crm.leads AS l
  WHERE l.id = p_lead_id
    AND l.deleted_at IS NULL
  RETURNING * INTO v_cliente;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead nao encontrado'
      USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE crm.leads
  SET estagio = 'fechado', updated_at = now(), updated_by = auth.uid()
  WHERE id = p_lead_id;

  RETURN NEXT v_cliente;
END;
$$;

REVOKE ALL ON FUNCTION crm.criar_cliente_a_partir_de_lead(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.criar_cliente_a_partir_de_lead(uuid, text) TO authenticated;
