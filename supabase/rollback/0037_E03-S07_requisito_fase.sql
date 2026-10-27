-- Restaura comando anterior sem validação de fase.
CREATE OR REPLACE FUNCTION crm.solicitar_documento(
  p_cliente_id uuid,
  p_fase_id uuid,
  p_requisito_id text,
  p_sujeito_tipo text,
  p_sujeito_participante_id uuid,
  p_sujeito_familiar_id text,
  p_titulo text,
  p_prazo_em date,
  p_instrucao text,
  p_autor_id uuid
)
RETURNS documentos.documentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, jornada, documentos, programas, pg_temp
AS $$
DECLARE
  v_jornada_id         uuid;
  v_programa_id        text;
  v_programa_versao    text;
  v_documentos_exigidos jsonb;
  v_requisito          jsonb;
  v_requisito_tipo      text;
  v_papel_dirigido      text;
  v_restrito_ao_papel   boolean;
  v_envio_conjunto      boolean;
  v_documento           documentos.documentos%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'solicitacao de documento negada' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  -- Confirma que a fase pertence a uma jornada DESTE cliente e já resolve o programa do caso na
  -- mesma consulta (jornada.jornadas.programa_id/programa_versao, mesma origem usada por
  -- crm.preparar_caso/crm.convidar_participante).
  SELECT j.id, j.programa_id, j.programa_versao INTO v_jornada_id, v_programa_id, v_programa_versao
  FROM jornada.fases f
  JOIN jornada.jornadas j ON j.id = f.jornada_id
  WHERE f.id = p_fase_id AND j.cliente_id = p_cliente_id;

  IF v_jornada_id IS NULL THEN
    RAISE EXCEPTION 'fase nao pertence ao caso' USING ERRCODE = '22023';
  END IF;

  -- Sujeito 'participante': precisa ser participante ATIVO do MESMO caso -- fecha o cenário
  -- "sujeito de outro caso" (US2/US6, FR-016) e "participante revogado continua sendo alvo de
  -- solicitação nova".
  IF p_sujeito_tipo = 'participante' THEN
    IF NOT EXISTS (
      SELECT 1 FROM crm.participantes
      WHERE id = p_sujeito_participante_id AND cliente_id = p_cliente_id AND estado = 'ativo'
    ) THEN
      RAISE EXCEPTION 'sujeito nao pertence ao caso' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT p.documentos_exigidos INTO v_documentos_exigidos
  FROM programas.programas p
  WHERE p.codigo = v_programa_id AND p.versao = v_programa_versao;

  IF v_documentos_exigidos IS NULL THEN
    RAISE EXCEPTION 'programa do caso nao encontrado no catalogo' USING ERRCODE = '22023';
  END IF;

  -- Localiza o requisito pelo campo `id` (RequisitoDocumento.id, programas/domain/types.ts) --
  -- único dentro do array, ao contrário de `tipo`. **Correção em 2026-10-16 (revisão
  -- adversarial)**: a versão anterior buscava por `tipo` e pegava o primeiro elemento que
  -- casasse -- um programa com dois requisitos do mesmo `tipo` (ex.: visto R: "passaporte"
  -- genérico + "passaporte" da organização, restrito e dirigido a `organizacao_aplicante`)
  -- fazia a RPC copiar silenciosamente a marca de restrição do requisito ERRADO. `id` não tem
  -- essa ambiguidade.
  SELECT elem INTO v_requisito
  FROM jsonb_array_elements(v_documentos_exigidos) AS elem
  WHERE elem ->> 'id' = p_requisito_id
  LIMIT 1;

  IF v_requisito IS NULL THEN
    RAISE EXCEPTION 'requisito nao encontrado no catalogo do programa' USING ERRCODE = '22023';
  END IF;

  -- `tipo`/`papel_dirigido`/`restrito_ao_papel`/`envio_conjunto` -- todos copiados do
  -- REQUISITO JÁ RESOLVIDO POR ID do catálogo, NUNCA de parâmetro do chamador --
  -- design-tecnico.md §2 / contracts/operacoes.md ("marca de restrito é copiada do programa,
  -- não digitada livremente"). `tipo` em particular deixou de vir de parâmetro nesta correção:
  -- como a busca agora é por `id`, não haveria mais um `p_requisito_tipo` para gravar -- grava-
  -- se o `tipo` do PRÓPRIO requisito encontrado, que é consistente por construção com o `id`
  -- que o motivou.
  v_requisito_tipo := v_requisito ->> 'tipo';
  v_papel_dirigido := v_requisito ->> 'papelDirigido';
  v_restrito_ao_papel := COALESCE((v_requisito ->> 'restrito')::boolean, false);
  v_envio_conjunto := COALESCE((v_requisito ->> 'envioConjunto')::boolean, false);

  INSERT INTO documentos.documentos (
    cliente_id, fase_id, jornada_id, nome, tipo, status,
    sujeito_tipo, sujeito_participante_id, sujeito_familiar_id,
    papel_dirigido, restrito_ao_papel, envio_conjunto,
    prazo_em, instrucao
  ) VALUES (
    p_cliente_id, p_fase_id, v_jornada_id, p_titulo, v_requisito_tipo, 'pendente',
    p_sujeito_tipo, p_sujeito_participante_id, p_sujeito_familiar_id,
    v_papel_dirigido, v_restrito_ao_papel, v_envio_conjunto,
    p_prazo_em, p_instrucao
  )
  RETURNING * INTO v_documento;

  RETURN v_documento;
END;
$$;

REVOKE ALL ON FUNCTION crm.solicitar_documento(uuid, uuid, text, text, uuid, text, text, date, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.solicitar_documento(uuid, uuid, text, text, uuid, text, text, date, text, uuid) TO service_role;
