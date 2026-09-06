-- E13-S12 AC-1/AC-2/AC-3: Vault privado, recibo deduplicado e agente só no backend.
\set ON_ERROR_STOP on

INSERT INTO configuracoes.contas_canal (id, provedor, nome_exibicao, identificador, ativa)
VALUES (
  '51515151-5151-4151-8151-515151515151', 'evolution', 'WhatsApp teste', '5511999999999', true
);

BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  SELECT configuracoes.salvar_segredo_integracao(
    'evolution:51515151-5151-4151-8151-515151515151',
    '{"apiKey":"evo-key","webhookToken":"token-aleatorio"}'
  );
  DO $$
  BEGIN
    ASSERT configuracoes.obter_segredo_integracao(
      'evolution:51515151-5151-4151-8151-515151515151'
    ) = '{"apiKey":"evo-key","webhookToken":"token-aleatorio"}',
      'service_role deveria ler valor guardado no Vault';
  END $$;
COMMIT;

-- AC-2: usuário normal não vê referência nem consegue chamar RPC que decifra valor.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"51515151-5151-4151-8151-515151515150","app_metadata":{"role":"admin"},"role":"authenticated"}';
  DO $$
  BEGIN
    BEGIN
      PERFORM * FROM configuracoes.referencias_cofre;
      ASSERT false, 'authenticated não pode ler referências do cofre';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
    BEGIN
      PERFORM configuracoes.obter_segredo_integracao('evolution:51515151-5151-4151-8151-515151515151');
      ASSERT false, 'authenticated não pode decifrar Vault por RPC';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END $$;
COMMIT;

-- AC-3: mesmo id do provedor só cria primeira entrada e só esta vira resposta.
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  DO $$
  DECLARE
    v_primeiro record;
    v_segundo record;
  BEGIN
    SELECT * INTO v_primeiro
    FROM comunicacao.registrar_entrada_evolution(
      '51515151-5151-4151-8151-515151515151', NULL, 'Contato teste', '5511999999998',
      'evo-msg-001', 'Olá, preciso de ajuda.', now()
    );
    SELECT * INTO v_segundo
    FROM comunicacao.registrar_entrada_evolution(
      '51515151-5151-4151-8151-515151515151', NULL, 'Contato teste', '5511999999998',
      'evo-msg-001', 'Olá, preciso de ajuda.', now()
    );
    ASSERT v_primeiro.processar AND v_primeiro.conversa_id IS NOT NULL,
      'primeiro recebimento deveria processar';
    ASSERT NOT v_segundo.processar, 'retry do mesmo webhook não pode processar duas vezes';

    PERFORM comunicacao.concluir_entrada_evolution(
      v_primeiro.conversa_id, 'evo-msg-001', 'respondido', 'resposta:evo-msg-001', 'Olá! Como posso ajudar?', 0.01
    );
    ASSERT (SELECT count(*) FROM comunicacao.webhooks_evolution WHERE origem_id = 'evo-msg-001') = 1,
      'recibo Evolution deveria ser único';
    ASSERT (SELECT status FROM comunicacao.webhooks_evolution WHERE origem_id = 'evo-msg-001') = 'respondido',
      'recibo deveria fechar após resposta';
    ASSERT (SELECT jsonb_array_length(mensagens) FROM comunicacao.conversas WHERE id = v_primeiro.conversa_id) = 2,
      'conversa deveria guardar entrada e uma única saída';
  END $$;
COMMIT;

DO $$ BEGIN RAISE NOTICE 'E13-S12: cofre e deduplicação Evolution passaram'; END $$;
