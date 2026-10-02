-- E13-S12/E13-S13: Vault privado, recibo deduplicado por canal, vínculo por telefone e agente só no
-- backend. Roda em Postgres limpo com o shim (assinaturas reais do Vault).
\set ON_ERROR_STOP on

INSERT INTO configuracoes.contas_canal (id, provedor, nome_exibicao, identificador, ativa) VALUES
  ('51515151-5151-4151-8151-515151515151', 'evolution', 'WhatsApp teste', '5511999999999', true),
  ('52525252-5252-4252-8252-525252525252', 'whatsapp_oficial', 'WhatsApp oficial teste', '5511988887777', true),
  ('53535353-5353-4353-8353-535353535353', 'instagram', 'Instagram teste', 'akros_teste', true);

-- Cliente com telefone formatado como o CRM guarda ("+55 11 98888-1001").
INSERT INTO crm.clientes (id, nome, email, telefone, tipo_visto, case_manager) VALUES
  ('61616161-6161-4161-8161-616161616161', 'Cliente Telefone', 'tel@example.com', '+55 11 98888-1001',
   'EB-2 NIW', 'Natalia Luz'),
  ('62626262-6262-4262-8262-626262626262', 'Cliente Sem Telefone', 'sem@example.com', '',
   'EB-2 NIW', 'Natalia Luz');

-- A guarda do Vault confere as assinaturas REAIS (4 e 5 argumentos): a versão anterior conferia
-- 3 e 4 e abortava no Supabase real (A-03).
DO $$
BEGIN
  ASSERT to_regprocedure('vault.create_secret(text,text,text,uuid)') IS NOT NULL,
    'shim precisa expor create_secret com a assinatura real (4 argumentos)';
  ASSERT to_regprocedure('vault.update_secret(uuid,text,text,text,uuid)') IS NOT NULL,
    'shim precisa expor update_secret com a assinatura real (5 argumentos)';
END $$;

-- ───────────────────────── Cofre ─────────────────────────
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  SELECT configuracoes.salvar_segredo_integracao(
    'evolution:51515151-5151-4151-8151-515151515151',
    '{"apiKey":"evo-key","webhookToken":"token-aleatorio"}'
  );
  SELECT configuracoes.salvar_segredo_integracao(
    'meta-whatsapp:52525252-5252-4252-8252-525252525252',
    '{"accessToken":"t","appSecret":"s","verifyToken":"v"}'
  );
  SELECT configuracoes.salvar_segredo_integracao(
    'meta-instagram:53535353-5353-4353-8353-535353535353',
    '{"accessToken":"t","appSecret":"s","verifyToken":"v"}'
  );
  -- Atualizar o mesmo escopo mantém um item só e troca o valor.
  SELECT configuracoes.salvar_segredo_integracao(
    'evolution:51515151-5151-4151-8151-515151515151',
    '{"apiKey":"evo-key-2","webhookToken":"token-aleatorio"}'
  );
  DO $$
  BEGIN
    ASSERT configuracoes.obter_segredo_integracao(
      'evolution:51515151-5151-4151-8151-515151515151'
    ) = '{"apiKey":"evo-key-2","webhookToken":"token-aleatorio"}',
      'service_role deveria ler o valor atualizado do Vault';
    ASSERT (SELECT count(*) FROM configuracoes.referencias_cofre
            WHERE escopo = 'evolution:51515151-5151-4151-8151-515151515151') = 1,
      'atualizar não pode criar segundo item';
    ASSERT configuracoes.obter_segredo_integracao(
      'meta-instagram:53535353-5353-4353-8353-535353535353'
    ) LIKE '%verifyToken%', 'escopo meta-instagram deveria existir';
    BEGIN
      PERFORM configuracoes.salvar_segredo_integracao('desconhecido:51515151-5151-4151-8151-515151515151', 'x');
      ASSERT false, 'escopo fora da lista não pode ser aceito';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
  END $$;
COMMIT;

-- Usuário normal (mesmo admin) não vê referência nem decifra Vault por RPC.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"51515151-5151-4151-8151-515151515150","app_metadata":{"role":"admin"},"role":"authenticated"}';
  DO $$
  BEGIN
    BEGIN
      PERFORM * FROM configuracoes.referencias_cofre;
      ASSERT false, 'authenticated não pode ler referências do cofre';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      PERFORM configuracoes.obter_segredo_integracao('evolution:51515151-5151-4151-8151-515151515151');
      ASSERT false, 'authenticated não pode decifrar Vault por RPC';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      PERFORM comunicacao.registrar_entrada_canal(
        '51515151-5151-4151-8151-515151515151', NULL, 'x', '5511999999990', 'id-x', 'oi', now());
      ASSERT false, 'authenticated não pode registrar entrada de canal';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      PERFORM * FROM comunicacao.webhooks_canal;
      ASSERT false, 'authenticated não pode ler recibos';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      PERFORM crm.obter_cliente_por_telefone('5511988881001');
      ASSERT false, 'authenticated não pode resolver telefone de cliente';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END $$;
COMMIT;

-- ───────────────────── Telefone (achado A-04) ─────────────────────
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  DO $$
  BEGIN
    -- O CRM guarda formatado; o provedor entrega só dígitos.
    ASSERT crm.normalizar_telefone('+55 (11) 98888-1001') = '551188881001',
      'normalização remove formatação e o nono dígito do celular BR';
    ASSERT crm.normalizar_telefone('5511988881001') = crm.normalizar_telefone('+55 11 98888-1001'),
      'dígitos puros e formato do CRM precisam coincidir';
    ASSERT crm.normalizar_telefone('551188881001') = crm.normalizar_telefone('+55 11 98888-1001'),
      'WhatsApp que entrega o celular sem o nono dígito precisa coincidir';
    ASSERT crm.normalizar_telefone('+1 (469) 758-9773') = '14697589773', 'número fora do Brasil só perde formatação';
    ASSERT crm.normalizar_telefone(NULL) = '', 'nulo vira vazio';

    ASSERT (SELECT id FROM crm.obter_cliente_por_telefone('5511988881001'))
      = '61616161-6161-4161-8161-616161616161', 'dígitos puros devem achar o cliente formatado';
    ASSERT (SELECT id FROM crm.obter_cliente_por_telefone('551188881001'))
      = '61616161-6161-4161-8161-616161616161', 'sem o nono dígito também deve achar';
    ASSERT (SELECT id FROM crm.obter_cliente_por_telefone('+55 11 98888-1001'))
      = '61616161-6161-4161-8161-616161616161', 'formato do CRM também deve achar';
    ASSERT NOT EXISTS (SELECT 1 FROM crm.obter_cliente_por_telefone('5511977770000')),
      'telefone de outra pessoa não pode vincular';
    ASSERT NOT EXISTS (SELECT 1 FROM crm.obter_cliente_por_telefone('')),
      'telefone vazio nunca vincula (cliente sem telefone não pode casar com tudo)';
    ASSERT NOT EXISTS (SELECT 1 FROM crm.obter_cliente_por_telefone('123')),
      'telefone curto nunca vincula';
  END $$;
COMMIT;

-- ─────────────── Recibo deduplicado, por canal e por conta ───────────────
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  DO $$
  DECLARE
    v_primeiro record;
    v_segundo record;
    v_outro_canal record;
    v_instagram record;
  BEGIN
    -- Evolution: mensagem de cliente conhecido, vínculo e evento na timeline.
    SELECT * INTO v_primeiro FROM comunicacao.registrar_entrada_canal(
      '51515151-5151-4151-8151-515151515151', '61616161-6161-4161-8161-616161616161', 'Cliente Telefone',
      '5511988881001', 'evo-msg-001', 'Olá, preciso de ajuda.', now());
    SELECT * INTO v_segundo FROM comunicacao.registrar_entrada_canal(
      '51515151-5151-4151-8151-515151515151', '61616161-6161-4161-8161-616161616161', 'Cliente Telefone',
      '5511988881001', 'evo-msg-001', 'Olá, preciso de ajuda.', now());
    ASSERT v_primeiro.processar AND v_primeiro.conversa_id IS NOT NULL, 'primeiro recebimento processa';
    ASSERT NOT v_segundo.processar, 'retry do mesmo evento não pode processar duas vezes';

    PERFORM comunicacao.concluir_entrada_canal(
      v_primeiro.conversa_id, 'evo-msg-001', 'respondido', 'resposta:evo-msg-001', 'Olá! Como posso ajudar?', 0.01);
    ASSERT (SELECT count(*) FROM comunicacao.webhooks_canal WHERE origem_id = 'evo-msg-001'
            AND conta_canal_id = '51515151-5151-4151-8151-515151515151') = 1,
      'recibo único';
    ASSERT (SELECT status FROM comunicacao.webhooks_canal WHERE origem_id = 'evo-msg-001'
            AND conta_canal_id = '51515151-5151-4151-8151-515151515151') = 'respondido',
      'recibo fecha após resposta';
    ASSERT (SELECT jsonb_array_length(mensagens) FROM comunicacao.conversas WHERE id = v_primeiro.conversa_id) = 2,
      'conversa guarda entrada e uma única saída';
    ASSERT (SELECT canal FROM comunicacao.conversas WHERE id = v_primeiro.conversa_id) = 'evolution',
      'canal da conversa vem do provedor da conta';
    ASSERT (SELECT cliente_id FROM comunicacao.conversas WHERE id = v_primeiro.conversa_id)
      = '61616161-6161-4161-8161-616161616161', 'conversa vinculada ao cliente';
    ASSERT (SELECT count(*) FROM comunicacao.eventos
            WHERE cliente_id = '61616161-6161-4161-8161-616161616161' AND canal = 'whatsapp') = 2,
      'entrada e saída geram evento whatsapp na timeline';

    -- Segunda mensagem do mesmo contato entra na MESMA conversa, em ordem.
    SELECT * INTO v_segundo FROM comunicacao.registrar_entrada_canal(
      '51515151-5151-4151-8151-515151515151', NULL, 'Cliente Telefone',
      '5511988881001', 'evo-msg-002', 'Mais uma pergunta.', now());
    ASSERT v_segundo.processar AND v_segundo.conversa_id = v_primeiro.conversa_id,
      'mesmo contato continua a mesma conversa';
    ASSERT (SELECT jsonb_array_length(mensagens) FROM comunicacao.conversas WHERE id = v_primeiro.conversa_id) = 3,
      'segunda entrada anexada, sem perder nenhuma';

    -- Mesmo id de provedor em OUTRA conta não é duplicata.
    SELECT * INTO v_outro_canal FROM comunicacao.registrar_entrada_canal(
      '52525252-5252-4252-8252-525252525252', NULL, 'Lead WhatsApp',
      '5511977770000', 'evo-msg-001', 'Oi pelo oficial.', now());
    ASSERT v_outro_canal.processar AND v_outro_canal.conversa_id <> v_primeiro.conversa_id,
      'id repetido em outra conta é mensagem diferente';
    ASSERT (SELECT canal FROM comunicacao.conversas WHERE id = v_outro_canal.conversa_id) = 'whatsapp_oficial',
      'WhatsApp oficial registra canal whatsapp_oficial';
    ASSERT (SELECT cliente_id FROM comunicacao.conversas WHERE id = v_outro_canal.conversa_id) IS NULL,
      'contato desconhecido gera conversa sem cliente (lead)';

    -- Instagram: id do remetente, canal e evento "instagram".
    SELECT * INTO v_instagram FROM comunicacao.registrar_entrada_canal(
      '53535353-5353-4353-8353-535353535353', '61616161-6161-4161-8161-616161616161', 'Perfil IG',
      '17841400000000001', 'mid.ig.001', 'Oi pelo direct.', now());
    ASSERT v_instagram.processar, 'Instagram processa';
    ASSERT (SELECT canal FROM comunicacao.conversas WHERE id = v_instagram.conversa_id) = 'instagram',
      'conversa do Instagram';
    ASSERT (SELECT count(*) FROM comunicacao.eventos
            WHERE cliente_id = '61616161-6161-4161-8161-616161616161' AND canal = 'instagram') = 1,
      'timeline aceita canal instagram';

    -- Falha do provedor fecha como falhou, sem texto de saída.
    PERFORM comunicacao.concluir_entrada_canal(v_instagram.conversa_id, 'mid.ig.001', 'falhou');
    ASSERT (SELECT status FROM comunicacao.webhooks_canal WHERE origem_id = 'mid.ig.001') = 'falhou',
      'recibo falhou';
    ASSERT (SELECT jsonb_array_length(mensagens) FROM comunicacao.conversas WHERE id = v_instagram.conversa_id) = 1,
      'falha não inventa resposta na conversa';

    -- Conta inexistente, entrada inválida e status inválido são recusados.
    BEGIN
      PERFORM comunicacao.registrar_entrada_canal(
        '99999999-9999-4999-8999-999999999999', NULL, 'x', '5511999999990', 'id-z', 'oi', now());
      ASSERT false, 'conta inexistente deve falhar';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    BEGIN
      PERFORM comunicacao.registrar_entrada_canal(
        '51515151-5151-4151-8151-515151515151', NULL, 'x', '5511999999990', 'id-w', '', now());
      ASSERT false, 'texto vazio deve falhar';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    BEGIN
      PERFORM comunicacao.concluir_entrada_canal(v_instagram.conversa_id, 'mid.ig.001', 'qualquer');
      ASSERT false, 'status inválido deve falhar';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
  END $$;
COMMIT;

-- Duas entregas simultâneas do mesmo id não duplicam: o script não simula duas sessões, então o
-- teste confere que as garantias que resolvem a corrida (índices únicos) existem.
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'comunicacao.webhooks_canal'::regclass AND contype = 'u'
  ), 'unicidade (conta, id do provedor) precisa existir';
  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'comunicacao' AND indexname = 'conversas_conta_contato_unico_idx'
  ), 'unicidade (conta, contato) precisa existir';
END $$;

DO $$ BEGIN RAISE NOTICE 'E13-S12/S13: cofre, telefone e deduplicação multicanal passaram'; END $$;
