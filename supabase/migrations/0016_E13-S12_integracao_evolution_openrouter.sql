-- Description: Cofre de segredos e persistência deduplicada para agentes Evolution/OpenRouter.
-- Story: E13-S12
-- Created: 2026-09-05

-- Rollback: DROP FUNCTION IF EXISTS comunicacao.concluir_entrada_evolution(uuid, text, text, text, text, numeric);
--           DROP FUNCTION IF EXISTS comunicacao.registrar_entrada_evolution(uuid, uuid, text, text, text, text, timestamptz);
--           DROP FUNCTION IF EXISTS crm.obter_cliente_por_telefone(text);
--           DROP FUNCTION IF EXISTS configuracoes.obter_segredo_integracao(text);
--           DROP FUNCTION IF EXISTS configuracoes.salvar_segredo_integracao(text, text);
--           DROP TABLE IF EXISTS comunicacao.webhooks_evolution, configuracoes.referencias_cofre CASCADE;

-- Habilita Vault pela própria migration quando a distribuição o oferece. CI usa uma imagem
-- PostgreSQL pura e fornece apenas o mesmo contrato no shim; produção Supabase instala extensão
-- real sem painel/manual. Se instalação self-hosted não disponibiliza a extensão, falha fechada
-- em vez de aceitar chave em tabela/JSON público por "fallback" inseguro.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'supabase_vault') THEN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault';
  END IF;
  IF to_regprocedure('vault.create_secret(text,text,text)') IS NULL
     OR to_regprocedure('vault.update_secret(uuid,text,text,text)') IS NULL THEN
    RAISE EXCEPTION 'Supabase Vault indisponível: habilite supabase_vault antes de aplicar E13-S12';
  END IF;
END $$;

-- Mesmo que uma configuração padrão do Vault conceda algo amplo, nenhum papel exposto pela API
-- pode consultar view decriptada ou chamar helpers diretamente. As RPCs abaixo são a fronteira.
REVOKE ALL ON SCHEMA vault FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA vault FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA vault FROM PUBLIC, anon, authenticated;

-- Só referencia o item cifrado pelo Vault. Não há API key, token de webhook nem ciphertext nesta
-- tabela; inclusive service_role precisa passar pelas RPCs abaixo para tocar o valor.
CREATE TABLE configuracoes.referencias_cofre (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo       text NOT NULL UNIQUE CHECK (escopo ~ '^(evolution|openrouter):[0-9a-f-]{36}$'),
  cofre_id     uuid NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE configuracoes.referencias_cofre ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.referencias_cofre FORCE ROW LEVEL SECURITY;

-- Nenhum GRANT para anon/authenticated. GRANT explícito evita depender de default privilege.
GRANT ALL ON configuracoes.referencias_cofre TO service_role;

CREATE FUNCTION configuracoes.salvar_segredo_integracao(p_escopo text, p_valor text)
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
  IF p_escopo !~ '^(evolution|openrouter):[0-9a-f-]{36}$' OR length(p_valor) = 0 THEN
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

CREATE FUNCTION configuracoes.obter_segredo_integracao(p_escopo text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, configuracoes, vault
AS $$
DECLARE
  v_valor text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'acesso ao cofre negado' USING ERRCODE = '42501';
  END IF;

  SELECT cofre.decrypted_secret INTO v_valor
  FROM configuracoes.referencias_cofre referencia
  JOIN vault.decrypted_secrets cofre ON cofre.id = referencia.cofre_id
  WHERE referencia.escopo = p_escopo;

  RETURN v_valor;
END;
$$;

REVOKE ALL ON FUNCTION configuracoes.salvar_segredo_integracao(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION configuracoes.obter_segredo_integracao(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION configuracoes.salvar_segredo_integracao(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION configuracoes.obter_segredo_integracao(text) TO service_role;

-- Evolution também recebe primeiro contatos ainda não convertidos em cliente. A identidade da
-- conversa passa a ser conta + telefone; cliente_id continua opcional e recebe vínculo ao achar
-- telefone normalizado no CRM.
-- Nullable é alteração de contrato deliberada: contato de WhatsApp pode ser lead sem login/cliente.
-- squawk-ignore ban-drop-not-null
ALTER TABLE comunicacao.conversas ALTER COLUMN cliente_id DROP NOT NULL;
ALTER TABLE comunicacao.conversas
  ADD COLUMN conta_canal_id uuid,
  ADD COLUMN contato_telefone text;
ALTER TABLE comunicacao.conversas
  ADD CONSTRAINT conversas_evolution_contato CHECK (
    canal <> 'evolution' OR (conta_canal_id IS NOT NULL AND contato_telefone IS NOT NULL)
  ) NOT VALID;
-- NOT VALID evita scan/lock de escrita em conversas existentes. A regra já vale para toda linha
-- nova; validar legado exige janela operacional própria, pois dados antigos podem ser externos.
ALTER TABLE comunicacao.conversas
  ADD CONSTRAINT conversas_conta_canal_fk
  FOREIGN KEY (conta_canal_id) REFERENCES configuracoes.contas_canal(id)
  NOT VALID;
CREATE UNIQUE INDEX conversas_evolution_contato_unico_idx
  ON comunicacao.conversas (conta_canal_id, contato_telefone)
  WHERE canal = 'evolution';

-- Recibo mínimo do provedor. Não repete payload ou token: basta para deduplicar e auditar estado.
CREATE TABLE comunicacao.webhooks_evolution (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_canal_id  uuid NOT NULL REFERENCES configuracoes.contas_canal(id),
  origem_id       text NOT NULL,
  conversa_id     uuid REFERENCES comunicacao.conversas(id),
  status          text NOT NULL DEFAULT 'recebido'
    CHECK (status IN ('recebido', 'respondido', 'handoff', 'ignorado', 'falhou')),
  motivo          text,
  recebido_em     timestamptz NOT NULL DEFAULT now(),
  concluido_em    timestamptz,
  UNIQUE (conta_canal_id, origem_id)
);

CREATE INDEX webhooks_evolution_pendentes_idx
  ON comunicacao.webhooks_evolution (recebido_em)
  WHERE status IN ('recebido', 'falhou');

ALTER TABLE comunicacao.webhooks_evolution ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicacao.webhooks_evolution FORCE ROW LEVEL SECURITY;
GRANT ALL ON comunicacao.webhooks_evolution TO service_role;

-- Resolve telefone no servidor; a Edge Function não precisa carregar CRM inteiro com service_role.
CREATE FUNCTION crm.obter_cliente_por_telefone(p_telefone text)
RETURNS TABLE (id uuid, nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, crm
AS $$
  SELECT cliente.id, cliente.nome
  FROM crm.clientes cliente
  WHERE cliente.deleted_at IS NULL
    AND regexp_replace(cliente.telefone, '\\D', '', 'g') = regexp_replace(p_telefone, '\\D', '', 'g')
  ORDER BY cliente.created_at ASC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION crm.obter_cliente_por_telefone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.obter_cliente_por_telefone(text) TO service_role;

-- Insere recibo antes de chamar rede. Unique no recebimento protege retry de Evolution e dois
-- workers simultâneos; lock na conversa mantém o JSONB em ordem sem update perdido.
CREATE FUNCTION comunicacao.registrar_entrada_evolution(
  p_conta_canal_id uuid,
  p_cliente_id uuid,
  p_cliente_nome text,
  p_telefone text,
  p_origem_id text,
  p_texto text,
  p_ocorrido_em timestamptz
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
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'registro Evolution negado' USING ERRCODE = '42501';
  END IF;
  IF length(p_origem_id) = 0 OR length(p_telefone) < 8 OR length(p_texto) = 0 OR length(p_texto) > 4000 THEN
    RAISE EXCEPTION 'mensagem Evolution inválida' USING ERRCODE = '22023';
  END IF;

  INSERT INTO comunicacao.webhooks_evolution (conta_canal_id, origem_id)
  VALUES (p_conta_canal_id, p_origem_id)
  ON CONFLICT (conta_canal_id, origem_id) DO NOTHING
  RETURNING id INTO v_recibo_id;

  IF v_recibo_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  SELECT id INTO v_conversa_id
  FROM comunicacao.conversas
  WHERE canal = 'evolution'
    AND conta_canal_id = p_conta_canal_id
    AND contato_telefone = p_telefone
  FOR UPDATE;

  v_nome := COALESCE(NULLIF(trim(p_cliente_nome), ''), 'Contato WhatsApp');
  IF v_conversa_id IS NULL THEN
    INSERT INTO comunicacao.conversas (
      cliente_id, cliente_nome, canal, conta_canal_id, contato_telefone, mensagens, atendido_por_ia
    ) VALUES (
      p_cliente_id,
      v_nome,
      'evolution',
      p_conta_canal_id,
      p_telefone,
      jsonb_build_array(jsonb_build_object(
        'id', p_origem_id, 'autor', 'cliente', 'texto', p_texto,
        'enviadoEm', p_ocorrido_em, 'lida', false
      )),
      false
    ) RETURNING id INTO v_conversa_id;
  ELSE
    UPDATE comunicacao.conversas
    SET cliente_id = COALESCE(cliente_id, p_cliente_id),
        cliente_nome = CASE WHEN cliente_nome = 'Contato WhatsApp' THEN v_nome ELSE cliente_nome END,
        mensagens = mensagens || jsonb_build_array(jsonb_build_object(
          'id', p_origem_id, 'autor', 'cliente', 'texto', p_texto,
          'enviadoEm', p_ocorrido_em, 'lida', false
        )),
        updated_at = now()
    WHERE id = v_conversa_id;
  END IF;

  UPDATE comunicacao.webhooks_evolution SET conversa_id = v_conversa_id WHERE id = v_recibo_id;

  IF p_cliente_id IS NOT NULL THEN
    INSERT INTO comunicacao.eventos (
      cliente_id, canal, direcao, autor, conteudo, ocorrido_em, origem_id
    ) VALUES (
      p_cliente_id, 'whatsapp', 'entrada', v_nome, p_texto, p_ocorrido_em, p_origem_id
    );
  END IF;

  RETURN QUERY SELECT true, v_conversa_id;
END;
$$;

-- Fecha recibo e, se houve envio, anexa resposta e evento numa única transação local.
CREATE FUNCTION comunicacao.concluir_entrada_evolution(
  p_conversa_id uuid,
  p_origem_id text,
  p_status text,
  p_saida_id text DEFAULT NULL,
  p_texto_saida text DEFAULT NULL,
  p_custo numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, comunicacao
AS $$
DECLARE
  v_cliente_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'conclusão Evolution negada' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('respondido', 'handoff', 'ignorado', 'falhou') THEN
    RAISE EXCEPTION 'status Evolution inválido' USING ERRCODE = '22023';
  END IF;

  IF p_texto_saida IS NOT NULL THEN
    UPDATE comunicacao.conversas
    SET mensagens = mensagens || jsonb_build_array(jsonb_build_object(
          'id', COALESCE(p_saida_id, gen_random_uuid()::text),
          'autor', 'agente_ia', 'texto', p_texto_saida, 'enviadoEm', now(), 'lida', true
        )),
        atendido_por_ia = true,
        custo_ia = CASE WHEN p_custo IS NULL THEN custo_ia ELSE COALESCE(custo_ia, 0) + p_custo END,
        updated_at = now()
    WHERE id = p_conversa_id
    RETURNING cliente_id INTO v_cliente_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'conversa Evolution inexistente' USING ERRCODE = '22023'; END IF;

    IF v_cliente_id IS NOT NULL THEN
      INSERT INTO comunicacao.eventos (
        cliente_id, canal, direcao, autor, conteudo, ocorrido_em, origem_id
      ) VALUES (
        v_cliente_id, 'whatsapp', 'saida', 'Agente IA', p_texto_saida, now(), p_saida_id
      );
    END IF;
  END IF;

  UPDATE comunicacao.webhooks_evolution
  SET status = p_status,
      motivo = CASE WHEN p_status = 'falhou' THEN 'falha externa; revisar no inbox' ELSE NULL END,
      concluido_em = now()
  WHERE conversa_id = p_conversa_id AND origem_id = p_origem_id;
END;
$$;

REVOKE ALL ON FUNCTION comunicacao.registrar_entrada_evolution(uuid, uuid, text, text, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION comunicacao.concluir_entrada_evolution(uuid, text, text, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION comunicacao.registrar_entrada_evolution(uuid, uuid, text, text, text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION comunicacao.concluir_entrada_evolution(uuid, text, text, text, text, numeric) TO service_role;

CREATE TRIGGER audit_configuracoes_referencias_cofre
  AFTER INSERT OR UPDATE OR DELETE ON configuracoes.referencias_cofre
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
