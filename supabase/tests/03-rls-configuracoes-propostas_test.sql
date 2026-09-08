-- E13-S10 AC-2/AC-3/AC-4/AC-5/AC-6: constraints, segredo, RLS e auditoria.
\set ON_ERROR_STOP on

-- Semente como owner antes de assumir papel da API.
INSERT INTO crm.leads (id, nome, email, telefone, origem, tipo_visto_interesse)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lead Proposta', 'proposta.lead@example.com',
        '11999999998', 'site', 'eb2-niw');

INSERT INTO crm.clientes (id, nome, email, telefone, tipo_visto, case_manager)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Cliente Proposta', 'proposta.cliente@example.com',
        '11999999997', 'eb2-niw', 'Natalia');

INSERT INTO configuracoes.equipe (id, nome, cargo)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Dona Agenda', 'Operacao'),
       ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Membro Agenda', 'Operacao');

INSERT INTO configuracoes.contas_agenda (
  id, provedor, nome_exibicao, escopos, dono_id, email_endereco, credenciais_configuradas,
  metadados_publicos
)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'google', 'Agenda tecnica', ARRAY['agenda', 'email'],
  'cccccccc-cccc-cccc-cccc-cccccccccccc', 'agenda@example.com', true,
  '{"clientId":"public-client-id","calendarId":"agenda@example.com"}'::jsonb
);

INSERT INTO configuracoes.contas_agenda_compartilhamentos (conta_id, membro_id)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

-- AC-2: proposta referencia exatamente um lado da origem.
INSERT INTO crm.propostas (
  id, lead_id, escopo, itens_escopo, tipo_visto, valor, moeda, condicoes, valido_ate
)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Escopo teste',
  '["Item 1"]'::jsonb, 'eb2-niw', 1000, 'BRL', 'Pagamento teste', now() + interval '30 days'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO crm.propostas (escopo, itens_escopo, tipo_visto, valor, moeda, condicoes, valido_ate)
    VALUES ('Sem origem', '[]', 'eb2-niw', 1, 'BRL', 'Teste', now());
    ASSERT false, 'proposta sem origem deveria violar XOR';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO crm.propostas (
      lead_id, cliente_id, escopo, itens_escopo, tipo_visto, valor, moeda, condicoes, valido_ate
    ) VALUES (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Duas origens',
      '[]', 'eb2-niw', 1, 'BRL', 'Teste', now()
    );
    ASSERT false, 'proposta com duas origens deveria violar XOR';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  ASSERT NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema IN ('crm', 'configuracoes')
      AND table_name IN (
        'propostas', 'integracoes', 'contas_agenda', 'contas_canal',
        'contas_agenda_compartilhamentos', 'equipe'
      )
      AND column_name ~ '(token|segredo|secret|senha|password|credencial|credential)'
      AND column_name NOT LIKE '%configurado%'
  ), 'nenhuma coluna de credencial pode existir nesta onda';
END $$;

-- AC-3: dono, escopos e compartilhamento respeitam FKs/PK composta.
DO $$
BEGIN
  BEGIN
    INSERT INTO configuracoes.contas_agenda (provedor, nome_exibicao, escopos, dono_id)
    VALUES ('google', 'Dono inexistente', ARRAY['agenda'], '99999999-9999-9999-9999-999999999999');
    ASSERT false, 'dono inexistente deveria violar FK';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO configuracoes.contas_agenda (provedor, nome_exibicao, escopos, dono_id)
    VALUES ('google', 'Escopo invalido', ARRAY['agenda', 'pagamentos'], 'cccccccc-cccc-cccc-cccc-cccccccccccc');
    ASSERT false, 'escopo invalido deveria falhar';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  BEGIN
    INSERT INTO configuracoes.contas_agenda_compartilhamentos (conta_id, membro_id)
    VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'dddddddd-dddd-dddd-dddd-dddddddddddd');
    ASSERT false, 'compartilhamento duplicado deveria falhar';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END $$;

-- AC-4: JSONB aceita IDs publicos, mas bloqueia nomes de chaves de segredo em qualquer nivel.
DO $$
BEGIN
  BEGIN
    INSERT INTO configuracoes.integracoes (
      codigo, nome, fornecedor, categoria, descricao, metadados_publicos
    ) VALUES (
      'integracao-insegura', 'Insegura', 'Teste', 'crm', 'Teste',
      '{"oauth":{"refreshToken":"nunca-persistir"}}'::jsonb
    );
    ASSERT false, 'metadado com refreshToken deveria falhar';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
END $$;

-- AC-5: cliente recebe colecoes vazias e nao escreve em nenhuma tabela da onda.
DO $$
BEGIN
  ASSERT (
    SELECT count(*)
    FROM (VALUES
      ('crm', 'propostas'),
      ('configuracoes', 'equipe'),
      ('configuracoes', 'integracoes'),
      ('configuracoes', 'contas_agenda'),
      ('configuracoes', 'contas_agenda_compartilhamentos'),
      ('configuracoes', 'contas_canal')
    ) AS esperadas(schema_name, table_name)
    JOIN pg_namespace n ON n.nspname = esperadas.schema_name
    JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = esperadas.table_name
    WHERE c.relrowsecurity AND c.relforcerowsecurity
  ) = 6, 'toda tabela da onda precisa de RLS ENABLE e FORCE';
END $$;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"12121212-1212-1212-1212-121212121212","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM crm.propostas) = 0, 'cliente nao pode ver propostas';
    ASSERT (SELECT count(*) FROM configuracoes.equipe) = 0, 'cliente nao pode ver equipe';
    ASSERT (SELECT count(*) FROM configuracoes.integracoes) = 0, 'cliente nao pode ver integracoes';
    ASSERT (SELECT count(*) FROM configuracoes.contas_agenda) = 0, 'cliente nao pode ver contas agenda';
    ASSERT (SELECT count(*) FROM configuracoes.contas_agenda_compartilhamentos) = 0,
      'cliente nao pode ver compartilhamentos';
    ASSERT (SELECT count(*) FROM configuracoes.contas_canal) = 0, 'cliente nao pode ver contas canal';

    BEGIN
      INSERT INTO configuracoes.integracoes (codigo, nome, fornecedor, categoria, descricao)
      VALUES ('cliente-invasor', 'Invasor', 'Teste', 'crm', 'Nao deveria inserir');
      ASSERT false, 'cliente nao pode inserir integracao';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;

    BEGIN
      INSERT INTO crm.propostas (
        lead_id, escopo, itens_escopo, tipo_visto, valor, moeda, condicoes, valido_ate
      ) VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Invasao', '[]', 'eb2-niw', 1, 'BRL', 'Nao inserir', now()
      );
      ASSERT false, 'cliente nao pode inserir proposta';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;

    BEGIN
      INSERT INTO configuracoes.equipe (nome, cargo) VALUES ('Invasor', 'Nenhum');
      ASSERT false, 'cliente nao pode inserir equipe';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;

    BEGIN
      INSERT INTO configuracoes.contas_agenda (provedor, nome_exibicao, escopos, dono_id)
      VALUES ('google', 'Invasao', ARRAY['agenda'], 'cccccccc-cccc-cccc-cccc-cccccccccccc');
      ASSERT false, 'cliente nao pode inserir conta agenda';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;

    BEGIN
      INSERT INTO configuracoes.contas_agenda_compartilhamentos (conta_id, membro_id)
      VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
      ASSERT false, 'cliente nao pode inserir compartilhamento';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;

    BEGIN
      INSERT INTO configuracoes.contas_canal (provedor, nome_exibicao, identificador)
      VALUES ('instagram', 'Invasao', '@invasor');
      ASSERT false, 'cliente nao pode inserir conta canal';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END $$;
COMMIT;

-- Admin enxerga, insere e atualiza por RLS real.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"13131313-1313-1313-1313-131313131313","app_metadata":{"role":"admin"}}';
  INSERT INTO configuracoes.integracoes (codigo, nome, fornecedor, categoria, descricao)
  VALUES ('integracao-admin', 'Integração admin', 'Teste', 'crm', 'Escrita admin');
  UPDATE configuracoes.integracoes SET ativa = false WHERE codigo = 'integracao-admin';
  INSERT INTO configuracoes.contas_canal (provedor, nome_exibicao, identificador)
  VALUES ('instagram', 'Canal admin', '@teste');
  UPDATE crm.propostas SET status = 'enviada' WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  UPDATE configuracoes.equipe SET cargo = 'Operacao senior'
  WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  UPDATE configuracoes.contas_agenda SET ativa = false
  WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  UPDATE configuracoes.contas_agenda_compartilhamentos
  SET updated_by = auth.uid()
  WHERE conta_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    AND membro_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM crm.propostas WHERE status = 'enviada') = 1,
      'admin deveria atualizar proposta';
    ASSERT (SELECT count(*) FROM configuracoes.equipe WHERE cargo = 'Operacao senior') = 1,
      'admin deveria atualizar equipe';
    ASSERT (SELECT count(*) FROM configuracoes.integracoes WHERE codigo = 'integracao-admin' AND NOT ativa) = 1,
      'admin deveria inserir e atualizar integracao';
    ASSERT (SELECT count(*) FROM configuracoes.contas_agenda WHERE NOT ativa) = 1,
      'admin deveria atualizar conta agenda';
    ASSERT (SELECT count(*) FROM configuracoes.contas_agenda_compartilhamentos
            WHERE updated_by = '13131313-1313-1313-1313-131313131313') = 1,
      'admin deveria atualizar compartilhamento';
    ASSERT (SELECT count(*) FROM configuracoes.contas_canal WHERE identificador = '@teste') = 1,
      'admin deveria inserir conta canal';
  END $$;
COMMIT;

-- AC-6: toda mudanca da onda deixou trilha no audit append-only.
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM audit.eventos WHERE tabela IN (
    'crm.propostas', 'configuracoes.equipe', 'configuracoes.integracoes',
    'configuracoes.contas_agenda', 'configuracoes.contas_agenda_compartilhamentos',
    'configuracoes.contas_canal'
  )) >= 12, 'triggers da onda deveriam registrar alteracoes';
END $$;

DO $$ BEGIN RAISE NOTICE 'E13-S10: constraints, RLS e auditoria passaram'; END $$;
