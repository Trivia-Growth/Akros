-- Description: RPCs transacionais da Edge Function `envio-comandos` (E03-S07, Fase 5/US2,
--              T059-T060, ADR-0019, design-tecnico.md Sec2.1) -- mesmo template SECURITY
--              DEFINER de 0022/0024 (guarda service_role primeiro, so DEPOIS set_config com o
--              autor real). Tres funcoes:
--
--              `arquivos.reservar_envio` -- cria, numa unica transacao, `arquivos.versoes`
--              (reservada) + `arquivos.reservas_envio`, apos validar participacao/papel/fase/
--              tamanho/mime. Reusa `crm.participo_do_caso`/`crm.tenho_papel`
--              (0017) -- que leem `auth.uid()`/`auth.jwt()` -- porque o `set_config` do passo 2
--              do template injeta `sub = p_autor_id` ANTES dessas chamadas: `auth.uid()` dentro
--              desta funcao passa a resolver para o autor real da requisicao, nao para
--              `service_role`. `p_eh_admin` (decidido pela Edge Function a partir do
--              `app_metadata.role` do token ORIGINAL do chamador -- perdido depois do
--              `set_config`, que substitui o JWT inteiro) e quem permite a um admin ignorar as
--              checagens de papel/fase, sem o qual nenhuma chamada de admin teria como passar
--              (admin normalmente nao tem linha em `crm.participantes`/`crm.clientes` para o
--              cliente alheio).
--
--              `arquivos.finalizar_envio` -- SO faz a escrita atomica (versao -> recebida,
--              documento -> enviado, trabalho de transferencia -> pendente) com revisao
--              otimista; a checagem do objeto no Storage (existencia, tamanho, assinatura
--              `%PDF-`) acontece ANTES, na Edge Function (`_shared/io-storage-envios.ts`) --
--              Storage nao participa de transacao Postgres, entao "uma transacao" aqui e so a
--              escrita no banco, nao o par Storage+banco (ver T060 no brief/tasks.md).
--
--              `jornada.enviar_etapa_para_avaliacao` -- transicao simples
--              `pendente -> em_analise` com revisao otimista. Assinatura EXATA pedida pela task
--              (sem `p_eh_admin`): autorizacao aqui e so "autor participa do caso da etapa"
--              (`crm.participo_do_caso`, qualquer papel) -- CONCERN registrado no relatorio desta
--              task: sem um parametro de admin nesta assinatura, uma chamada feita por um admin
--              (que tipicamente nao tem linha em crm.participantes/crm.clientes para o cliente
--              alheio) falha com 404 em vez de ser bypassada, diferente de reservar_envio/
--              finalizar_envio. Fora de escopo mudar a assinatura dada pela task.
--
--              ERRCODEs novos que `_shared/caso-comandos.ts`/`envio-comandos.ts` nao mapeavam
--              ainda: `P0002` (no_data_found, reaproveitado para "nao encontrado" -> 404, sem
--              confirmar existencia do recurso restrito -- design-tecnico.md Sec2 "Erros"),
--              `54000` (program_limit_exceeded, reaproveitado para "tamanho acima do limite" ->
--              413 -- nao existe SQLSTATE padrao para "payload grande demais"), `55000`
--              (object_not_in_prerequisite_state, para "reserva expirada"/"versao em estado
--              incompativel" -> 409) e `40001` (serialization_failure, para "revisao esperada
--              nao bate" -> 409, mesma categoria semantica de conflito de concorrencia que o
--              SQLSTATE padrao ja carrega). Todos documentados em `_shared/envio-comandos.ts`
--              (`erroDeNegocio`).
-- Story: E03-S07
-- Created: 2026-10-21

-- Rollback:
--   DROP FUNCTION IF EXISTS jornada.enviar_etapa_para_avaliacao(uuid, integer, uuid);
--   DROP FUNCTION IF EXISTS arquivos.finalizar_envio(uuid, integer, uuid);
--   DROP FUNCTION IF EXISTS arquivos.reservar_envio(uuid, uuid, text, bigint, text, boolean, uuid);
--   ALTER TABLE arquivos.versoes DROP COLUMN IF EXISTS revisao;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- arquivos.versoes.revisao -- trava de revisao otimista de `finalizar_envio` (0020 nao previu
-- esta coluna; crm.contratos/jornada.* ja tem a sua desde 0017/0019/0021).
-- ─────────────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE arquivos.versoes ADD COLUMN revisao integer NOT NULL DEFAULT 1;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- arquivos.reservar_envio
-- ─────────────────────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- arquivos.finalizar_envio -- so a escrita atomica; a checagem do objeto no Storage (existe,
-- tamanho bate, assinatura %PDF-) ja aconteceu na Edge Function antes desta chamada.
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION arquivos.finalizar_envio(
  p_versao_id uuid,
  p_revisao_esperada integer,
  p_autor_id uuid
)
RETURNS arquivos.versoes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = arquivos, documentos, pg_temp
AS $$
DECLARE
  v_versao  arquivos.versoes%ROWTYPE;
  v_reserva arquivos.reservas_envio%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'finalizacao de envio negada' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  SELECT * INTO v_versao FROM arquivos.versoes WHERE id = p_versao_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'versao nao encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF v_versao.estado_recebimento <> 'reservada' THEN
    RAISE EXCEPTION 'versao nao esta mais reservada' USING ERRCODE = '55000';
  END IF;

  IF v_versao.revisao <> p_revisao_esperada THEN
    RAISE EXCEPTION 'revisao esperada nao corresponde a atual (%)' , v_versao.revisao
      USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_reserva FROM arquivos.reservas_envio WHERE versao_id = p_versao_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'reserva nao encontrada' USING ERRCODE = 'P0002';
  END IF;
  IF v_reserva.expira_em <= now() THEN
    RAISE EXCEPTION 'reserva expirada' USING ERRCODE = '55000';
  END IF;

  UPDATE arquivos.versoes
  SET estado_recebimento = 'recebida', recebido_em = now(), revisao = revisao + 1
  WHERE id = p_versao_id
  RETURNING * INTO v_versao;

  IF v_versao.documento_id IS NOT NULL THEN
    UPDATE documentos.documentos
    SET status = 'enviado', enviado_em = now(), revisao = revisao + 1, updated_at = now()
    WHERE id = v_versao.documento_id;
  END IF;

  INSERT INTO arquivos.trabalhos_transferencia (versao_id, estado) VALUES (p_versao_id, 'pendente');

  RETURN v_versao;
END;
$$;

REVOKE ALL ON FUNCTION arquivos.finalizar_envio(uuid, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION arquivos.finalizar_envio(uuid, integer, uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- jornada.enviar_etapa_para_avaliacao -- transicao simples pendente -> em_analise (E09-S05
-- conclui/libera fase depois, fora de escopo aqui).
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION jornada.enviar_etapa_para_avaliacao(
  p_etapa_id uuid,
  p_revisao_esperada integer,
  p_autor_id uuid
)
RETURNS jornada.etapas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jornada, crm, pg_temp
AS $$
DECLARE
  v_etapa      jornada.etapas%ROWTYPE;
  v_cliente_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'envio de etapa para avaliacao negado' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  SELECT j.cliente_id INTO v_cliente_id
  FROM jornada.etapas e
  JOIN jornada.fases f ON f.id = e.fase_id
  JOIN jornada.jornadas j ON j.id = f.jornada_id
  WHERE e.id = p_etapa_id
  FOR UPDATE OF e;

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'etapa nao encontrada' USING ERRCODE = 'P0002';
  END IF;

  -- Sem parametro de admin nesta assinatura (pedida exata pela task) -- ver CONCERN no
  -- comentario do topo deste arquivo e no relatorio desta task.
  IF NOT crm.participo_do_caso(v_cliente_id) THEN
    RAISE EXCEPTION 'etapa nao encontrada' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_etapa FROM jornada.etapas WHERE id = p_etapa_id;

  IF v_etapa.status <> 'pendente' THEN
    RAISE EXCEPTION 'etapa nao esta pendente' USING ERRCODE = '55000';
  END IF;

  IF v_etapa.revisao <> p_revisao_esperada THEN
    RAISE EXCEPTION 'revisao esperada nao corresponde a atual (%)', v_etapa.revisao
      USING ERRCODE = '40001';
  END IF;

  UPDATE jornada.etapas
  SET status = 'em_analise', revisao = revisao + 1, updated_at = now()
  WHERE id = p_etapa_id
  RETURNING * INTO v_etapa;

  RETURN v_etapa;
END;
$$;

REVOKE ALL ON FUNCTION jornada.enviar_etapa_para_avaliacao(uuid, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION jornada.enviar_etapa_para_avaliacao(uuid, integer, uuid) TO service_role;
