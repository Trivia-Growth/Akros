-- Description: E04-S17 — pasta do advogado parceiro, separada da pasta operacional
--              (`arquivos.vinculos_pasta`, E03-S07). `arquivos.vinculos_pasta_advogado` segue o
--              mesmo desenho de `vinculos_pasta` (0020): uma por caso, dentro da raiz autorizada
--              da mesma integração (ancestralidade validada no Deno, não aqui — mesmo critério
--              de `vincular_pasta`/0026). `documentos.documentos.compartilhavel_advogado` marca,
--              por documento, se pode entrar nessa pasta — nunca por padrão (FR-001). Pagamento
--              nunca ganha essa coluna (FR-002 é garantido por ausência de campo, não por regra
--              de aplicação que poderia ser esquecida).
--
--              RPC `arquivos.vincular_pasta_advogado` exige que a pasta operacional do caso já
--              exista (FR edge case) e `documentos.marcar_compartilhavel_advogado` liga/desliga
--              a marca — mesmo template SECURITY DEFINER do resto da feature.
-- Story: E04-S17
-- Created: 2026-11-06

-- Rollback:
--   DROP FUNCTION IF EXISTS documentos.marcar_compartilhavel_advogado(uuid, boolean, uuid);
--   DROP FUNCTION IF EXISTS arquivos.vincular_pasta_advogado(uuid, uuid, text, text, uuid);
--   ALTER TABLE documentos.documentos DROP COLUMN IF EXISTS compartilhavel_advogado;
--   DROP TABLE IF EXISTS arquivos.vinculos_pasta_advogado;

CREATE TABLE arquivos.vinculos_pasta_advogado (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id         uuid NOT NULL REFERENCES crm.clientes(id),
  integracao_id      uuid NOT NULL REFERENCES arquivos.integracoes_microsoft(id),
  drive_id           text NOT NULL,
  folder_item_id     text NOT NULL,
  caminho_exibicao   text,
  validado_por       uuid NOT NULL,
  validado_em        timestamptz NOT NULL DEFAULT now(),
  estado             text NOT NULL DEFAULT 'ativo' CHECK (estado IN ('ativo', 'bloqueado')),
  CONSTRAINT vinculo_advogado_caso_unico UNIQUE (cliente_id)
);

ALTER TABLE arquivos.vinculos_pasta_advogado ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos.vinculos_pasta_advogado FORCE ROW LEVEL SECURITY;
GRANT SELECT ON arquivos.vinculos_pasta_advogado TO authenticated;
GRANT ALL ON arquivos.vinculos_pasta_advogado TO service_role;

-- Admin-only: pasta do advogado nunca aparece para participante do caso (não é dado do cliente).
CREATE POLICY "admin_ve_vinculos_pasta_advogado" ON arquivos.vinculos_pasta_advogado
  FOR SELECT USING (crm.e_admin());

ALTER TABLE documentos.documentos ADD COLUMN compartilhavel_advogado boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION arquivos.vincular_pasta_advogado(
  p_cliente_id uuid,
  p_integracao_id uuid,
  p_folder_item_id text,
  p_caminho_exibicao text,
  p_autor_id uuid
)
RETURNS arquivos.vinculos_pasta_advogado
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = arquivos, pg_temp
AS $$
DECLARE
  v_integracao arquivos.integracoes_microsoft%ROWTYPE;
  v_vinculo arquivos.vinculos_pasta_advogado%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'vinculação de pasta do advogado negada' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM arquivos.vinculos_pasta WHERE cliente_id = p_cliente_id
  ) THEN
    RAISE EXCEPTION 'caso ainda não tem pasta operacional vinculada' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_integracao FROM arquivos.integracoes_microsoft WHERE id = p_integracao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'integração Microsoft não encontrada' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  INSERT INTO arquivos.vinculos_pasta_advogado (
    cliente_id, integracao_id, drive_id, folder_item_id, caminho_exibicao, validado_por
  ) VALUES (
    p_cliente_id, p_integracao_id, v_integracao.drive_id, p_folder_item_id, p_caminho_exibicao, p_autor_id
  )
  ON CONFLICT (cliente_id) DO UPDATE
    SET folder_item_id = EXCLUDED.folder_item_id,
        caminho_exibicao = EXCLUDED.caminho_exibicao,
        validado_por = EXCLUDED.validado_por,
        validado_em = now(),
        estado = 'ativo'
  RETURNING * INTO v_vinculo;

  RETURN v_vinculo;
END;
$$;

REVOKE ALL ON FUNCTION arquivos.vincular_pasta_advogado(uuid, uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION arquivos.vincular_pasta_advogado(uuid, uuid, text, text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION documentos.marcar_compartilhavel_advogado(
  p_documento_id uuid,
  p_compartilhavel boolean,
  p_autor_id uuid
)
RETURNS documentos.documentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = documentos, pg_temp
AS $$
DECLARE
  v_documento documentos.documentos%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'marcação de compartilhamento negada' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  UPDATE documentos.documentos
  SET compartilhavel_advogado = p_compartilhavel, updated_at = now()
  WHERE id = p_documento_id
  RETURNING * INTO v_documento;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'documento não encontrado' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_documento;
END;
$$;

REVOKE ALL ON FUNCTION documentos.marcar_compartilhavel_advogado(uuid, boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION documentos.marcar_compartilhavel_advogado(uuid, boolean, uuid) TO service_role;
