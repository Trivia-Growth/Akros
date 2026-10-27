-- Restaura a definição anterior de 0027, sem remover dados.
CREATE OR REPLACE FUNCTION arquivos.reservar_envio(
  p_solicitacao_id uuid,
  p_pagamento_id uuid,
  p_nome_arquivo text,
  p_tamanho_bytes bigint,
  p_mime text,
  p_eh_admin boolean,
  p_autor_id uuid
)
RETURNS TABLE (versao_id uuid, objeto_permitido text, expira_em timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = arquivos, documentos, crm, pg_temp
AS $$
DECLARE
  v_cliente_id       uuid;
  v_documento        documentos.documentos%ROWTYPE;
  v_participante_id  uuid;
  v_numero_versao    integer;
  v_versao_id        uuid;
  v_objeto_permitido text;
  v_expira_em        timestamptz;
BEGIN
  -- 1) Guarda SEMPRE primeiro (mesmo criterio de 0022/0024).
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'reserva de envio negada' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;
  IF (p_solicitacao_id IS NOT NULL)::int + (p_pagamento_id IS NOT NULL)::int <> 1 THEN
    RAISE EXCEPTION 'informe exatamente solicitacaoId OU pagamentoId' USING ERRCODE = '22023';
  END IF;

  -- 2) SO DEPOIS da guarda: injeta o autor real -- a partir daqui auth.uid() resolve p_autor_id,
  -- o que torna crm.participo_do_caso()/crm.tenho_papel() (0017) utilizaveis sem reescrever a
  -- logica de participacao aqui.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  -- 3) Resolve o destino e o cliente_id dele -- NUNCA de um clienteId que o corpo da requisicao
  -- mandaria (a Edge Function nem aceita esse campo): o unico cliente_id que importa e o do
  -- proprio documento/pagamento. "Nao encontrado" aqui cobre tanto o destino inexistente quanto
  -- o destino de outro caso que este autor nao alcanca -- 404 sem diferenciar os dois motivos
  -- (nao confirma existencia, mesmo criterio do design-tecnico.md Sec2 "Erros").
  IF p_solicitacao_id IS NOT NULL THEN
    SELECT * INTO v_documento FROM documentos.documentos WHERE id = p_solicitacao_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'documento nao encontrado' USING ERRCODE = 'P0002';
    END IF;
    v_cliente_id := v_documento.cliente_id;

    IF NOT p_eh_admin THEN
      IF NOT crm.participo_do_caso(v_cliente_id) THEN
        RAISE EXCEPTION 'documento nao encontrado' USING ERRCODE = 'P0002';
      END IF;

      -- Papel dirigido OU envio conjunto -- "qualquer papel participante serve" so vale quando
      -- o documento aceita envio_conjunto; caso contrario so quem tem o papel_dirigido exato
      -- (vinculo legado, papel NULL, nunca casa com um papel_dirigido especifico -- de proposito,
      -- ver autorizacao-caso.ts).
      IF NOT (
        v_documento.envio_conjunto
        OR (v_documento.papel_dirigido IS NOT NULL AND crm.tenho_papel(v_cliente_id, v_documento.papel_dirigido))
      ) THEN
        RAISE EXCEPTION 'papel sem autoridade para enviar este documento' USING ERRCODE = '42501';
      END IF;

      -- Fase nao liberada -> 404, nao 403 (confirmaria a existencia do requisito restrito para
      -- quem nao deveria ainda ve-lo -- design-tecnico.md Sec2 "Erros").
      IF v_documento.fase_id IS NOT NULL
         AND NOT documentos.fase_liberada_para_portal(v_documento.fase_id)
      THEN
        RAISE EXCEPTION 'fase ainda nao liberada' USING ERRCODE = 'P0002';
      END IF;
    END IF;

    SELECT COALESCE(MAX(numero_versao), 0) + 1 INTO v_numero_versao
    FROM arquivos.versoes WHERE documento_id = v_documento.id;
  ELSE
    SELECT cliente_id INTO v_cliente_id FROM pagamentos.pagamentos WHERE id = p_pagamento_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'pagamento nao encontrado' USING ERRCODE = 'P0002';
    END IF;

    -- pagamentos.pagamentos nao tem papel_dirigido/envio_conjunto/fase_id: qualquer participante
    -- ativo do caso (ou o vinculo legado) pode anexar comprovante -- so a participacao importa.
    IF NOT p_eh_admin AND NOT crm.participo_do_caso(v_cliente_id) THEN
      RAISE EXCEPTION 'pagamento nao encontrado' USING ERRCODE = 'P0002';
    END IF;

    SELECT COALESCE(MAX(numero_versao), 0) + 1 INTO v_numero_versao
    FROM arquivos.versoes WHERE pagamento_id = p_pagamento_id;
  END IF;

  -- 4) Tamanho (413) antes de MIME (422) -- mesma ordem do brief/tasks.md T059.
  IF p_tamanho_bytes > 20000000 THEN
    RAISE EXCEPTION 'arquivo acima do limite de 20000000 bytes' USING ERRCODE = '54000';
  END IF;
  IF p_mime <> 'application/pdf' THEN
    RAISE EXCEPTION 'apenas arquivos PDF sao aceitos' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_participante_id
  FROM crm.participantes
  WHERE cliente_id = v_cliente_id AND auth_user_id = p_autor_id AND estado = 'ativo'
  LIMIT 1;

  INSERT INTO arquivos.versoes (
    cliente_id, documento_id, pagamento_id, numero_versao, nome_original, mime, tamanho_bytes,
    estado_recebimento, enviado_por, participante_id
  ) VALUES (
    v_cliente_id, p_solicitacao_id, p_pagamento_id, v_numero_versao, p_nome_arquivo, p_mime,
    p_tamanho_bytes, 'reservada', p_autor_id, v_participante_id
  )
  RETURNING id INTO v_versao_id;

  v_objeto_permitido := v_cliente_id::text || '/' || v_versao_id::text || '.pdf';
  v_expira_em := now() + interval '24 hours';

  -- `idempotency_key` (NOT NULL UNIQUE, 0020): esta acao nao recebe idempotencyKey do cliente
  -- (design-tecnico.md Sec2 "Regras transversais" -- reservar_envio nao esta na lista de acoes
  -- idempotentes). Preenchida com o proprio versao_id, unico por natureza (1-para-1 com
  -- reservas_envio.versao_id, ja UNIQUE) -- nao finge ser uma chave de idempotencia de cliente
  -- que nunca existiu.
  INSERT INTO arquivos.reservas_envio (
    versao_id, objeto_permitido, tamanho_declarado, mime_declarado, idempotency_key, expira_em,
    criada_por
  ) VALUES (
    v_versao_id, v_objeto_permitido, p_tamanho_bytes, p_mime, v_versao_id::text, v_expira_em,
    p_autor_id
  );

  RETURN QUERY SELECT v_versao_id, v_objeto_permitido, v_expira_em;
END;
$$;

REVOKE ALL ON FUNCTION arquivos.reservar_envio(uuid, uuid, text, bigint, text, boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION arquivos.reservar_envio(uuid, uuid, text, bigint, text, boolean, uuid) TO service_role;
