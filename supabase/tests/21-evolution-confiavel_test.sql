-- E13-S15 (0039): servidor/matriz Evolution admin-only, estado do canal só pelo servidor, vínculo com
-- cliente só quando único, conversa "contato não identificado" invisível ao portal, anexos em bucket
-- privado e Vault ampliado. Roda em Postgres limpo com o shim, depois de todas as migrations.
\set ON_ERROR_STOP on

INSERT INTO configuracoes.contas_canal (id, provedor, nome_exibicao, identificador, ativa) VALUES
  ('71717171-7171-4171-8171-717171717171', 'evolution', 'WhatsApp S15', '5521977770001', true);

-- Clientes: dois com o MESMO telefone, um com telefone único.
INSERT INTO crm.clientes (id, nome, email, telefone, tipo_visto, case_manager) VALUES
  ('81818181-8181-4181-8181-818181818181', 'Casal A', 's15a@example.com', '+55 21 97777-0010', 'EB-2 NIW', 'Natalia Luz'),
  ('82828282-8282-4282-8282-828282828282', 'Casal B', 's15b@example.com', '+55 21 97777-0010', 'EB-2 NIW', 'Natalia Luz'),
  ('83838383-8383-4383-8383-838383838383', 'Única', 's15c@example.com', '+55 21 97777-0020', 'EB-2 NIW', 'Natalia Luz');

-- Logins dos clientes: `crm.meu_cliente_id()` resolve o cliente por `auth_user_id = auth.uid()`.
INSERT INTO auth.users (id, email) VALUES
  ('b3b3b3b3-b3b3-43b3-83b3-b3b3b3b3b3b3', 'casal-a@example.com'),
  ('b5b5b5b5-b5b5-45b5-85b5-b5b5b5b5b5b5', 'casal-b@example.com'),
  ('b4b4b4b4-b4b4-44b4-84b4-b4b4b4b4b4b4', 'unica@example.com');
UPDATE crm.clientes SET auth_user_id = 'b3b3b3b3-b3b3-43b3-83b3-b3b3b3b3b3b3' WHERE id = '81818181-8181-4181-8181-818181818181';
UPDATE crm.clientes SET auth_user_id = 'b5b5b5b5-b5b5-45b5-85b5-b5b5b5b5b5b5' WHERE id = '82828282-8282-4282-8282-828282828282';
UPDATE crm.clientes SET auth_user_id = 'b4b4b4b4-b4b4-44b4-84b4-b4b4b4b4b4b4' WHERE id = '83838383-8383-4383-8383-838383838383';

-- ───────────────────────── Vault: escopo da chave do servidor ─────────────────────────
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  SELECT configuracoes.salvar_segredo_integracao(
    'evolution-servidor:91919191-9191-4191-8191-919191919191', '{"apiKey":"chave-do-servidor"}');
  DO $$
  BEGIN
    ASSERT configuracoes.obter_segredo_integracao('evolution-servidor:91919191-9191-4191-8191-919191919191')
      = '{"apiKey":"chave-do-servidor"}', 'service_role lê a chave do servidor';
    BEGIN
      PERFORM configuracoes.salvar_segredo_integracao('evolution-servidor-x:91919191-9191-4191-8191-919191919191', 'x');
      ASSERT false, 'escopo fora da lista não pode ser aceito';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
  END $$;
COMMIT;

-- ───────────────── Servidor e matriz: um servidor, leitura só admin, escrita só servidor ─────────────────
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  INSERT INTO configuracoes.evolution_servidor (id, url_base, versao_detectada, estado, indicio)
  VALUES ('91919191-9191-4191-8191-919191919191', 'https://evo.exemplo.com', '2.3.7', 'compativel', 'abcd');
  INSERT INTO configuracoes.evolution_compatibilidade (versao, capacidades, afetada_logout, evidencia)
  VALUES ('2.3.7', ARRAY['instanceCreate','qr','connectionState','webhookHeaders','webhookEvents','sendText','deliveryStatus'],
          false, 'smoke 2026-10-27 no servidor de teste');
  DO $$
  BEGIN
    BEGIN
      INSERT INTO configuracoes.evolution_servidor (url_base) VALUES ('https://outro.exemplo.com');
      ASSERT false, 'só pode existir UM servidor Evolution';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
      UPDATE configuracoes.evolution_servidor SET url_base = 'http://inseguro.exemplo.com';
      ASSERT false, 'URL sem HTTPS não pode ser gravada';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
      UPDATE configuracoes.evolution_servidor SET indicio = '12345';
      ASSERT false, 'o indício guarda no máximo 4 caracteres (nunca a chave)';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
      INSERT INTO configuracoes.evolution_compatibilidade (versao, capacidades, evidencia)
      VALUES ('2.9.0', ARRAY['capacidade_inventada'], 'x1x');
      ASSERT false, 'capacidade desconhecida não pode entrar na matriz';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM configuracoes.evolution_servidor) = 1, 'admin vê o servidor';
    ASSERT (SELECT count(*) FROM configuracoes.evolution_compatibilidade) = 1, 'admin vê a matriz';
    BEGIN
      INSERT INTO configuracoes.evolution_compatibilidade (versao, capacidades, evidencia) VALUES ('9.9.9', ARRAY['qr'], 'xxx');
      ASSERT false, 'admin NÃO escreve a matriz direto: só pela função do servidor';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      UPDATE configuracoes.evolution_servidor SET estado = 'compativel';
      ASSERT false, 'admin NÃO altera o servidor direto';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM configuracoes.evolution_servidor) = 0, 'cliente não vê o servidor Evolution';
    ASSERT (SELECT count(*) FROM configuracoes.evolution_compatibilidade) = 0, 'cliente não vê a matriz';
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE anon;
  DO $$
  BEGIN
    BEGIN
      PERFORM * FROM configuracoes.evolution_servidor;
      ASSERT false, 'anon não lê o servidor';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END $$;
COMMIT;

-- ───────────────── Estado do canal: só o servidor muda ─────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    UPDATE configuracoes.contas_canal SET nome_exibicao = 'Renomeado pelo admin'
    WHERE id = '71717171-7171-4171-8171-717171717171';
    ASSERT FOUND, 'admin ainda renomeia a conta (campo comum)';
    BEGIN
      UPDATE configuracoes.contas_canal SET estado_conexao = 'conectado_verificado'
      WHERE id = '71717171-7171-4171-8171-717171717171';
      ASSERT false, 'admin NÃO declara o canal conectado pelo navegador';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      UPDATE configuracoes.contas_canal SET aceite_risco_em = now()
      WHERE id = '71717171-7171-4171-8171-717171717171';
      ASSERT false, 'admin NÃO registra o aceite de risco pulando o servidor';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      UPDATE configuracoes.contas_canal SET credenciais_configuradas = true
      WHERE id = '71717171-7171-4171-8171-717171717171';
      ASSERT false, 'admin NÃO marca credencial como confirmada';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      INSERT INTO configuracoes.contas_canal (provedor, nome_exibicao, identificador, estado_conexao)
      VALUES ('evolution', 'forjada', '5521999990000', 'conectado_verificado');
      ASSERT false, 'admin NÃO cria conta já conectada';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  DO $$
  BEGIN
    UPDATE configuracoes.contas_canal
    SET estado_conexao = 'aguardando_pareamento', nome_instancia = 'akros-717171717171417181717171',
        credenciais_configuradas = true
    WHERE id = '71717171-7171-4171-8171-717171717171';
    ASSERT (SELECT estado_conexao FROM configuracoes.contas_canal WHERE id = '71717171-7171-4171-8171-717171717171')
      = 'aguardando_pareamento', 'o servidor muda o estado';
    BEGIN
      UPDATE configuracoes.contas_canal SET estado_conexao = 'inventado'
      WHERE id = '71717171-7171-4171-8171-717171717171';
      ASSERT false, 'estado fora da lista é recusado';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
      INSERT INTO configuracoes.contas_canal (provedor, nome_exibicao, identificador, nome_instancia)
      VALUES ('evolution', 'duplicada', '5521999990001', 'akros-717171717171417181717171');
      ASSERT false, 'dois canais não compartilham a mesma instância';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END $$;
COMMIT;

-- ───────────────── Vínculo com cliente só quando único (FR-018) ─────────────────
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  DO $$
  BEGIN
    ASSERT NOT EXISTS (SELECT 1 FROM crm.obter_cliente_unico_por_telefone('5521977770010')),
      'dois clientes com o mesmo telefone: NINGUÉM é escolhido';
    ASSERT (SELECT id FROM crm.obter_cliente_unico_por_telefone('5521977770020')) = '83838383-8383-4383-8383-838383838383',
      'um único cliente vincula, inclusive sem formatação';
    ASSERT (SELECT id FROM crm.obter_cliente_unico_por_telefone('+55 21 97777-0020')) = '83838383-8383-4383-8383-838383838383',
      'com a formatação do CRM';
    ASSERT (SELECT id FROM crm.obter_cliente_unico_por_telefone('552177770020')) = '83838383-8383-4383-8383-838383838383',
      'sem o nono dígito';
    ASSERT NOT EXISTS (SELECT 1 FROM crm.obter_cliente_unico_por_telefone('')), 'vazio nunca vincula';
    ASSERT NOT EXISTS (SELECT 1 FROM crm.obter_cliente_unico_por_telefone('123')), 'curto nunca vincula';
    ASSERT NOT EXISTS (SELECT 1 FROM crm.obter_cliente_unico_por_telefone('5521900000000')), 'desconhecido não vincula';
  END $$;
COMMIT;

-- ───────────────── Registro de entrada: texto, anexo, não identificado ─────────────────
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  DO $$
  DECLARE
    v record;
    v_conversa uuid;
    v_conta uuid := '71717171-7171-4171-8171-717171717171';
  BEGIN
    -- Texto de cliente identificado: conversa + evento de timeline.
    SELECT * INTO v FROM comunicacao.registrar_entrada_canal(v_conta, '83838383-8383-4383-8383-838383838383',
      'Única', '5521977770020', 'm-1', 'Oi', now());
    ASSERT v.processar, 'primeira entrega processa';
    v_conversa := v.conversa_id;
    ASSERT (SELECT identificacao FROM comunicacao.conversas WHERE id = v_conversa) = 'identificada', 'identificada por padrão';
    ASSERT (SELECT count(*) FROM comunicacao.eventos WHERE origem_id = 'm-1') = 1, 'evento na timeline do cliente';

    -- Reentrega: não duplica.
    SELECT * INTO v FROM comunicacao.registrar_entrada_canal(v_conta, '83838383-8383-4383-8383-838383838383',
      'Única', '5521977770020', 'm-1', 'Oi', now());
    ASSERT NOT v.processar AND v.conversa_id IS NULL, 'reentrega não processa';
    ASSERT jsonb_array_length((SELECT mensagens FROM comunicacao.conversas WHERE id = v_conversa)) = 1, 'sem mensagem duplicada';

    -- Anexo sem legenda: guardado na conversa, com tipo e metadados; evento usa "[anexo]".
    SELECT * INTO v FROM comunicacao.registrar_entrada_canal(v_conta, '83838383-8383-4383-8383-838383838383',
      'Única', '5521977770020', 'm-2', '', now(), 'arquivo',
      '{"caminho":"71717171-7171-4171-8171-717171717171/m-2","nome":"contrato.pdf","mime":"application/pdf","tamanhoBytes":2048,"baixado":true}'::jsonb);
    ASSERT v.processar AND v.conversa_id = v_conversa, 'anexo entra na mesma conversa';
    ASSERT (SELECT mensagens -> 1 ->> 'tipo' FROM comunicacao.conversas WHERE id = v_conversa) = 'arquivo', 'tipo registrado';
    ASSERT (SELECT mensagens -> 1 ->> 'midiaNome' FROM comunicacao.conversas WHERE id = v_conversa) = 'contrato.pdf', 'nome do arquivo';
    ASSERT (SELECT mensagens -> 1 -> 'anexo' ->> 'baixado' FROM comunicacao.conversas WHERE id = v_conversa) = 'true', 'baixado';
    ASSERT (SELECT conteudo FROM comunicacao.eventos WHERE origem_id = 'm-2') = '[anexo]', 'timeline mostra [anexo]';

    -- Anexo que não pôde ser baixado continua registrado.
    SELECT * INTO v FROM comunicacao.registrar_entrada_canal(v_conta, '83838383-8383-4383-8383-838383838383',
      'Única', '5521977770020', 'm-3', 'foto do passaporte', now(), 'imagem',
      '{"nome":"imagem.jpg","mime":"image/jpeg","baixado":false,"motivo":"tamanho"}'::jsonb);
    ASSERT v.processar, 'anexo não baixado ainda vira mensagem';
    ASSERT (SELECT mensagens -> 2 -> 'anexo' ->> 'motivo' FROM comunicacao.conversas WHERE id = v_conversa) = 'tamanho', 'motivo guardado';

    -- Telefone compartilhado: conversa SEM cliente.
    SELECT * INTO v FROM comunicacao.registrar_entrada_canal(v_conta, NULL, 'Contato', '5521977770010', 'm-4', 'Oi', now());
    ASSERT v.processar, 'processa';
    ASSERT (SELECT cliente_id FROM comunicacao.conversas WHERE id = v.conversa_id) IS NULL, 'telefone ambíguo não vincula';
    ASSERT (SELECT count(*) FROM comunicacao.eventos WHERE origem_id = 'm-4') = 0, 'sem timeline de cliente algum';

    -- Contato não identificado: guardado, sem cliente.
    SELECT * INTO v FROM comunicacao.registrar_entrada_canal(v_conta, NULL, 'Contato não identificado',
      'lid:9988776655', 'm-5', 'Oi, sou eu', now(), 'texto', NULL, 'nao_identificada');
    ASSERT v.processar, 'não identificado também é guardado';
    ASSERT (SELECT identificacao FROM comunicacao.conversas WHERE id = v.conversa_id) = 'nao_identificada', 'marcado';
    ASSERT (SELECT cliente_id FROM comunicacao.conversas WHERE id = v.conversa_id) IS NULL, 'sem cliente';

    -- Entradas inválidas.
    BEGIN
      PERFORM comunicacao.registrar_entrada_canal(v_conta, '83838383-8383-4383-8383-838383838383', 'x', 'lid:1234', 'm-6', 'oi',
        now(), 'texto', NULL, 'nao_identificada');
      ASSERT false, 'não identificada NUNCA recebe cliente';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    BEGIN
      PERFORM comunicacao.registrar_entrada_canal(v_conta, NULL, 'x', '5521977770099', 'm-7', '', now());
      ASSERT false, 'texto vazio não é mensagem de texto';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    BEGIN
      PERFORM comunicacao.registrar_entrada_canal(v_conta, NULL, 'x', '5521977770099', 'm-8', 'oi', now(), 'executavel');
      ASSERT false, 'tipo desconhecido é recusado';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    BEGIN
      INSERT INTO comunicacao.conversas (cliente_id, cliente_nome, canal, conta_canal_id, contato_externo, identificacao)
      VALUES ('83838383-8383-4383-8383-838383838383', 'x', 'evolution', v_conta, 'lid:55555', 'nao_identificada');
      ASSERT false, 'a tabela também barra não identificada com cliente';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
  END $$;
COMMIT;

-- ───────────────── Portal: cliente só vê a própria conversa vinculada ─────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"b3b3b3b3-b3b3-43b3-83b3-b3b3b3b3b3b3","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM comunicacao.conversas WHERE conta_canal_id = '71717171-7171-4171-8171-717171717171') = 0,
      'Casal A não vê conversa do telefone compartilhado nem as dos outros';
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"b5b5b5b5-b5b5-45b5-85b5-b5b5b5b5b5b5","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM comunicacao.conversas WHERE conta_canal_id = '71717171-7171-4171-8171-717171717171') = 0,
      'Casal B (o outro dono do telefone compartilhado) também não vê a conversa ambígua';
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"b4b4b4b4-b4b4-44b4-84b4-b4b4b4b4b4b4","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM comunicacao.conversas WHERE conta_canal_id = '71717171-7171-4171-8171-717171717171') = 1,
      'a cliente Única vê só a PRÓPRIA conversa (não a ambígua nem a não identificada)';
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM comunicacao.conversas WHERE conta_canal_id = '71717171-7171-4171-8171-717171717171') = 3,
      'a equipe vê as três (própria, ambígua e não identificada)';
  END $$;
COMMIT;

-- ───────────────── Bucket de anexos: privado, leitura só admin, escrita só servidor ─────────────────
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  DO $$
  BEGIN
    ASSERT (SELECT public FROM storage.buckets WHERE id = 'comunicacao-anexos') = false, 'bucket privado';
    ASSERT (SELECT file_size_limit FROM storage.buckets WHERE id = 'comunicacao-anexos') = 15728640, 'limite de 15 MB';
    ASSERT NOT ('text/html' = ANY (SELECT unnest(allowed_mime_types) FROM storage.buckets WHERE id = 'comunicacao-anexos')),
      'HTML não é tipo permitido';
    INSERT INTO storage.objects (bucket_id, name) VALUES ('comunicacao-anexos', '71717171/m-2');
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM storage.objects WHERE bucket_id = 'comunicacao-anexos') = 1, 'admin enxerga o anexo';
    BEGIN
      INSERT INTO storage.objects (bucket_id, name) VALUES ('comunicacao-anexos', 'forjado');
      ASSERT false, 'admin NÃO grava anexo pelo navegador';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"b4b4b4b4-b4b4-44b4-84b4-b4b4b4b4b4b4","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM storage.objects WHERE bucket_id = 'comunicacao-anexos') = 0, 'cliente NÃO enxerga anexo de conversa';
  END $$;
COMMIT;
