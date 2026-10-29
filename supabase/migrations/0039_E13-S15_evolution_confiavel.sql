-- Description: Evolution confiável (E13-S15, ADR-0021): servidor Evolution e matriz de
--              compatibilidade como dado (não constante), estado de conexão do canal, conversa
--              "contato não identificado", vínculo cliente SÓ quando único, anexos de conversa em
--              bucket privado e Vault ampliado para a chave do servidor.
-- Story: E13-S15
-- Created: 2026-10-27

-- Reverso: DROP FUNCTION IF EXISTS crm.obter_cliente_unico_por_telefone(text);
--          DROP FUNCTION IF EXISTS comunicacao.registrar_entrada_canal(uuid, uuid, text, text, text, text, timestamptz, text, jsonb, text);
--          (recriar comunicacao.registrar_entrada_canal de 7 argumentos a partir de 0016)
--          DROP TRIGGER IF EXISTS contas_canal_proteger_estado ON configuracoes.contas_canal;
--          DROP FUNCTION IF EXISTS configuracoes.proteger_estado_canal();
--          DROP POLICY IF EXISTS "admin_le_anexos_de_conversa" ON storage.objects;
--          DELETE FROM storage.buckets WHERE id = 'comunicacao-anexos';
--          ALTER TABLE comunicacao.conversas DROP COLUMN identificacao;
--          ALTER TABLE configuracoes.contas_canal DROP COLUMN estado_conexao, DROP COLUMN ultimo_erro_codigo,
--            DROP COLUMN nome_instancia, DROP COLUMN aceite_risco_em, DROP COLUMN aceite_risco_por;
--          DROP TABLE IF EXISTS configuracoes.evolution_compatibilidade, configuracoes.evolution_servidor;
--          (reverter a regex de escopo em referencias_cofre e salvar_segredo_integracao para a de 0016)
--          Só reverter enquanto não houver conversa real; depois de haver dado, criar 0040.

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 1. Vault: escopo novo para a chave global do servidor Evolution
-- ─────────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE configuracoes.referencias_cofre DROP CONSTRAINT referencias_cofre_escopo_check;
ALTER TABLE configuracoes.referencias_cofre
  ADD CONSTRAINT referencias_cofre_escopo_check
  CHECK (escopo ~ '^(evolution|evolution-servidor|openrouter|meta-whatsapp|meta-instagram|microsoft-graph|upload-sessao):[0-9a-f-]{36}$')
  NOT VALID;

CREATE OR REPLACE FUNCTION configuracoes.salvar_segredo_integracao(p_escopo text, p_valor text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, configuracoes, vault
AS $$
DECLARE
  v_cofre_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'acesso ao cofre negado' USING ERRCODE = '42501';
  END IF;
  IF p_escopo !~ '^(evolution|evolution-servidor|openrouter|meta-whatsapp|meta-instagram|microsoft-graph|upload-sessao):[0-9a-f-]{36}$'
     OR length(p_valor) = 0 THEN
    RAISE EXCEPTION 'referência de cofre inválida' USING ERRCODE = '22023';
  END IF;

  SELECT cofre_id INTO v_cofre_id
  FROM configuracoes.referencias_cofre
  WHERE escopo = p_escopo
  FOR UPDATE;

  IF v_cofre_id IS NULL THEN
    SELECT vault.create_secret(p_valor, 'akros/' || p_escopo, 'Credencial gerida pela Akros')
      INTO v_cofre_id;
    INSERT INTO configuracoes.referencias_cofre (escopo, cofre_id)
    VALUES (p_escopo, v_cofre_id);
  ELSE
    PERFORM vault.update_secret(
      v_cofre_id,
      p_valor,
      'akros/' || p_escopo,
      'Credencial gerida pela Akros'
    );
    UPDATE configuracoes.referencias_cofre SET updated_at = now() WHERE escopo = p_escopo;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 2. Servidor Evolution (uma linha: single-tenant, ADR-0009) e matriz de compatibilidade
--    A chave global NUNCA entra aqui: fica no Vault (escopo `evolution-servidor:<id>`).
-- ─────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE configuracoes.evolution_servidor (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url_base         text NOT NULL CHECK (url_base ~ '^https://' AND length(url_base) <= 300),
  versao_detectada text CHECK (versao_detectada IS NULL OR length(versao_detectada) <= 40),
  estado           text NOT NULL DEFAULT 'pendente'
    CHECK (estado IN ('pendente', 'compativel', 'incompativel')),
  motivo           text CHECK (motivo IS NULL OR length(motivo) <= 300),
  indicio          text NOT NULL DEFAULT '' CHECK (length(indicio) <= 4),
  atualizado_por   uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
-- No máximo UMA linha: o Akros tem um servidor Evolution por instalação.
CREATE UNIQUE INDEX evolution_servidor_unico ON configuracoes.evolution_servidor ((true));

CREATE TABLE configuracoes.evolution_compatibilidade (
  -- `id` existe porque o gatilho de auditoria (`audit.registrar_mudanca`) lê `NEW.id`.
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  versao         text NOT NULL UNIQUE CHECK (versao ~ '^[0-9A-Za-z._-]{1,40}$'),
  capacidades    text[] NOT NULL
    CHECK (capacidades <@ ARRAY['instanceCreate', 'qr', 'connectionState', 'webhookHeaders',
                                'webhookEvents', 'sendText', 'deliveryStatus', 'deleteInstance']::text[]),
  afetada_logout boolean NOT NULL DEFAULT false,
  evidencia      text NOT NULL CHECK (length(evidencia) BETWEEN 3 AND 500),
  registrada_por uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE configuracoes.evolution_servidor ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.evolution_servidor FORCE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.evolution_compatibilidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.evolution_compatibilidade FORCE ROW LEVEL SECURITY;

-- Leitura só admin; escrita só pelo servidor (Edge Function com service_role). Sem DELETE.
GRANT SELECT ON configuracoes.evolution_servidor TO authenticated;
GRANT SELECT ON configuracoes.evolution_compatibilidade TO authenticated;
GRANT SELECT, INSERT, UPDATE ON configuracoes.evolution_servidor TO service_role;
GRANT SELECT, INSERT, UPDATE ON configuracoes.evolution_compatibilidade TO service_role;

CREATE POLICY "so_admin_ve_evolution_servidor" ON configuracoes.evolution_servidor
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
CREATE POLICY "so_admin_ve_evolution_compatibilidade" ON configuracoes.evolution_compatibilidade
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE TRIGGER audit_configuracoes_evolution_servidor
  AFTER INSERT OR UPDATE OR DELETE ON configuracoes.evolution_servidor
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_configuracoes_evolution_compatibilidade
  AFTER INSERT OR UPDATE OR DELETE ON configuracoes.evolution_compatibilidade
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 3. Estado de conexão do canal (contas_canal)
-- ─────────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE configuracoes.contas_canal
  ADD COLUMN estado_conexao text NOT NULL DEFAULT 'sem_credencial',
  ADD COLUMN ultimo_erro_codigo text,
  ADD COLUMN nome_instancia text,
  ADD COLUMN aceite_risco_em timestamptz,
  ADD COLUMN aceite_risco_por uuid;

ALTER TABLE configuracoes.contas_canal
  ADD CONSTRAINT contas_canal_estado_conexao_check
  CHECK (estado_conexao IN ('sem_credencial', 'configuracao_incompleta', 'aguardando_pareamento',
                            'conectado_verificado', 'desconectado', 'erro')) NOT VALID,
  ADD CONSTRAINT contas_canal_ultimo_erro_codigo_check
  CHECK (ultimo_erro_codigo IS NULL OR ultimo_erro_codigo ~ '^[a-z0-9_]{1,60}$') NOT VALID,
  ADD CONSTRAINT contas_canal_nome_instancia_check
  CHECK (nome_instancia IS NULL OR nome_instancia ~ '^[A-Za-z0-9_-]{1,64}$') NOT VALID;

CREATE UNIQUE INDEX contas_canal_nome_instancia_unico
  ON configuracoes.contas_canal (nome_instancia) WHERE nome_instancia IS NOT NULL;

-- O estado de conexão só muda por quem PROVA a conexão (Edge Function com service_role). Um admin
-- editando a linha pelo navegador não pode declarar "conectado", pular o aceite de risco nem
-- apontar para outra instância: a política de UPDATE da conta é ampla (0014) e não olha colunas.
CREATE FUNCTION configuracoes.proteger_estado_canal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, configuracoes
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado_conexao <> 'sem_credencial' OR NEW.ultimo_erro_codigo IS NOT NULL
       OR NEW.nome_instancia IS NOT NULL OR NEW.aceite_risco_em IS NOT NULL
       OR NEW.aceite_risco_por IS NOT NULL THEN
      RAISE EXCEPTION 'estado do canal só é definido pelo servidor' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF (NEW.estado_conexao, NEW.ultimo_erro_codigo, NEW.nome_instancia, NEW.aceite_risco_em,
      NEW.aceite_risco_por, NEW.credenciais_configuradas)
     IS DISTINCT FROM
     (OLD.estado_conexao, OLD.ultimo_erro_codigo, OLD.nome_instancia, OLD.aceite_risco_em,
      OLD.aceite_risco_por, OLD.credenciais_configuradas) THEN
    RAISE EXCEPTION 'estado do canal só é alterado pelo servidor' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER contas_canal_proteger_estado
  BEFORE INSERT OR UPDATE ON configuracoes.contas_canal
  FOR EACH ROW EXECUTE FUNCTION configuracoes.proteger_estado_canal();

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 4. Conversa "contato não identificado" (sem telefone comprovado): nunca vinculada a cliente
-- ─────────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE comunicacao.conversas
  ADD COLUMN identificacao text NOT NULL DEFAULT 'identificada';
ALTER TABLE comunicacao.conversas
  ADD CONSTRAINT conversas_identificacao_check
  CHECK (identificacao IN ('identificada', 'nao_identificada')) NOT VALID,
  ADD CONSTRAINT conversas_nao_identificada_sem_cliente
  CHECK (identificacao = 'identificada' OR cliente_id IS NULL) NOT VALID;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 5. Vínculo com cliente SÓ quando há exatamente um com aquele telefone (FR-018)
--    (a regra anterior pegava o mais antigo: com telefone compartilhado, a conversa de uma pessoa
--    ia parar no portal de outra).
-- ─────────────────────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION crm.obter_cliente_unico_por_telefone(p_telefone text)
RETURNS TABLE (id uuid, nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, crm
AS $$
  WITH achados AS (
    SELECT cliente.id, cliente.nome
    FROM crm.clientes cliente
    WHERE cliente.deleted_at IS NULL
      AND length(crm.normalizar_telefone(p_telefone)) >= 8
      AND crm.normalizar_telefone(cliente.telefone) = crm.normalizar_telefone(p_telefone)
  )
  SELECT achados.id, achados.nome FROM achados WHERE (SELECT count(*) FROM achados) = 1
$$;

REVOKE ALL ON FUNCTION crm.obter_cliente_unico_por_telefone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.obter_cliente_unico_por_telefone(text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 6. Registro de entrada: tipo, anexo e identificação (substitui a de 7 argumentos de 0016)
-- ─────────────────────────────────────────────────────────────────────────────────────────────
DROP FUNCTION comunicacao.registrar_entrada_canal(uuid, uuid, text, text, text, text, timestamptz);

CREATE FUNCTION comunicacao.registrar_entrada_canal(
  p_conta_canal_id uuid,
  p_cliente_id uuid,
  p_cliente_nome text,
  p_contato_externo text,
  p_origem_id text,
  p_texto text,
  p_ocorrido_em timestamptz,
  p_tipo text DEFAULT 'texto',
  p_anexo jsonb DEFAULT NULL,
  p_identificacao text DEFAULT 'identificada'
)
RETURNS TABLE (processar boolean, conversa_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, comunicacao, configuracoes, crm
AS $$
DECLARE
  v_recibo_id uuid;
  v_conversa_id uuid;
  v_nome text;
  v_provedor text;
  v_canal_evento text;
  v_mensagem jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'registro de canal negado' USING ERRCODE = '42501';
  END IF;
  IF length(p_origem_id) = 0 OR length(p_contato_externo) < 4 OR length(p_contato_externo) > 64
     OR length(coalesce(p_texto, '')) > 4000
     OR p_tipo NOT IN ('texto', 'imagem', 'audio', 'arquivo', 'video')
     OR (p_tipo = 'texto' AND length(coalesce(p_texto, '')) = 0)
     OR p_identificacao NOT IN ('identificada', 'nao_identificada')
     OR (p_identificacao = 'nao_identificada' AND p_cliente_id IS NOT NULL)
     OR (p_anexo IS NOT NULL AND (jsonb_typeof(p_anexo) <> 'object' OR length(p_anexo::text) > 2000))
     OR (p_tipo <> 'texto' AND p_anexo IS NULL AND length(coalesce(p_texto, '')) = 0) THEN
    RAISE EXCEPTION 'mensagem de canal inválida' USING ERRCODE = '22023';
  END IF;

  SELECT conta.provedor INTO v_provedor
  FROM configuracoes.contas_canal conta
  WHERE conta.id = p_conta_canal_id AND conta.deleted_at IS NULL;
  IF v_provedor IS NULL THEN
    RAISE EXCEPTION 'conta de canal inexistente' USING ERRCODE = '22023';
  END IF;
  v_canal_evento := CASE WHEN v_provedor = 'instagram' THEN 'instagram' ELSE 'whatsapp' END;

  INSERT INTO comunicacao.webhooks_canal (conta_canal_id, origem_id)
  VALUES (p_conta_canal_id, p_origem_id)
  ON CONFLICT (conta_canal_id, origem_id) DO NOTHING
  RETURNING id INTO v_recibo_id;

  IF v_recibo_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  v_mensagem := jsonb_strip_nulls(jsonb_build_object(
    'id', p_origem_id, 'autor', 'cliente', 'texto', coalesce(p_texto, ''),
    'enviadoEm', p_ocorrido_em, 'lida', false,
    'tipo', p_tipo,
    'midiaNome', p_anexo ->> 'nome',
    'anexo', p_anexo
  ));

  SELECT id INTO v_conversa_id
  FROM comunicacao.conversas
  WHERE conta_canal_id = p_conta_canal_id
    AND contato_externo = p_contato_externo
  FOR UPDATE;

  v_nome := COALESCE(NULLIF(trim(p_cliente_nome), ''), 'Contato');
  IF v_conversa_id IS NULL THEN
    INSERT INTO comunicacao.conversas (
      cliente_id, cliente_nome, canal, conta_canal_id, contato_externo, mensagens, atendido_por_ia,
      identificacao
    ) VALUES (
      p_cliente_id, v_nome, v_provedor, p_conta_canal_id, p_contato_externo,
      jsonb_build_array(v_mensagem), false, p_identificacao
    ) RETURNING id INTO v_conversa_id;
  ELSE
    UPDATE comunicacao.conversas
    SET cliente_id = COALESCE(cliente_id, p_cliente_id),
        cliente_nome = CASE WHEN cliente_nome = 'Contato' THEN v_nome ELSE cliente_nome END,
        mensagens = mensagens || jsonb_build_array(v_mensagem),
        updated_at = now()
    WHERE id = v_conversa_id;
  END IF;

  UPDATE comunicacao.webhooks_canal SET conversa_id = v_conversa_id WHERE id = v_recibo_id;

  IF p_cliente_id IS NOT NULL THEN
    INSERT INTO comunicacao.eventos (
      cliente_id, canal, direcao, autor, conteudo, anexos, ocorrido_em, origem_id
    ) VALUES (
      p_cliente_id, v_canal_evento, 'entrada', v_nome,
      COALESCE(NULLIF(p_texto, ''), '[anexo]'),
      CASE WHEN p_anexo IS NULL THEN NULL
           ELSE jsonb_build_array(jsonb_build_object('nome', p_anexo ->> 'nome')) END,
      p_ocorrido_em, p_origem_id
    );
  END IF;

  RETURN QUERY SELECT true, v_conversa_id;
END;
$$;

REVOKE ALL ON FUNCTION comunicacao.registrar_entrada_canal(uuid, uuid, text, text, text, text, timestamptz, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION comunicacao.registrar_entrada_canal(uuid, uuid, text, text, text, text, timestamptz, text, jsonb, text) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 7. Bucket privado de anexos de conversa. Escrita: só service_role (Edge Function). Leitura:
--    só admin (link temporário). Nenhuma policy para cliente.
-- ─────────────────────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comunicacao-anexos', 'comunicacao-anexos', false, 15728640,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm',
        'video/mp4', 'video/webm', 'video/3gpp']
)
ON CONFLICT (id) DO NOTHING;

GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT ON storage.objects TO authenticated;

CREATE POLICY "admin_le_anexos_de_conversa" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'comunicacao-anexos'
    AND auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );
