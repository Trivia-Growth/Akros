-- AV-01..AV-03 (revisão adversarial do projeto, 2026-10-28): o cliente não escreve dado operacional.
-- Cliente e admin compartilham o role `authenticated`; o que os separa é a policy e o GRANT por
-- coluna. Antes da 0041 o cliente reescrevia a própria linha em crm.clientes, mudava a própria
-- reunião e criava pedido LGPD já "concluído" / consentimento retroativo pelo PostgREST.
-- Roda no job `db-tests`. Depende de `00-shim-supabase.sql` (auth.jwt() lê request.jwt.claims).

\set ON_ERROR_STOP on
BEGIN;

INSERT INTO auth.users (id) VALUES
  ('e7000000-0000-4000-8000-000000000001'),
  ('e7000000-0000-4000-8000-000000000002');
INSERT INTO crm.clientes (id, auth_user_id, nome, email, telefone, tipo_visto, case_manager, programa_id, programa_versao)
VALUES
  ('a7000000-0000-4000-8000-000000000001', 'e7000000-0000-4000-8000-000000000001',
   'Cliente A', 'a@example.test', '11900000001', 'eb2-niw', 'Natalia', 'eb2-niw', '1'),
  ('a7000000-0000-4000-8000-000000000002', 'e7000000-0000-4000-8000-000000000002',
   'Cliente B', 'b@example.test', '11900000002', 'eb2-niw', 'Bruno', 'eb2-niw', '1');
INSERT INTO agenda.reunioes (id, cliente_id, titulo, inicio, fim, canal, status, criada_por)
VALUES ('b7000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001',
        'Consulta', now() + interval '2 days', now() + interval '2 days 1 hour',
        'calendly', 'agendada', 'admin');

-- ── Cliente A ────────────────────────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000001","app_metadata":{"role":"cliente"}}';

DO $$
DECLARE linhas integer; erro text;
BEGIN
  -- AV-01: a própria linha de crm.clientes não muda (nem coluna operacional, nem de contato).
  UPDATE crm.clientes
     SET case_manager = 'Hacker', tipo_visto = 'eb1a', programa_id = 'outro',
         programa_versao = '999', deleted_at = now(), telefone = '11900000002'
   WHERE auth_user_id = 'e7000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS linhas = ROW_COUNT;
  ASSERT linhas = 0, 'AV-01: cliente atualizou a própria linha em crm.clientes (' || linhas || ')';
  ASSERT (SELECT case_manager = 'Natalia' AND tipo_visto = 'eb2-niw' AND programa_versao = '1'
                 AND deleted_at IS NULL AND telefone = '11900000001'
            FROM crm.clientes WHERE id = 'a7000000-0000-4000-8000-000000000001'),
         'AV-01: coluna operacional do cliente mudou';

  -- AV-02: a própria reunião não muda (horário, status, título).
  UPDATE agenda.reunioes
     SET inicio = now() - interval '10 days', status = 'realizada', titulo = 'x'
   WHERE id = 'b7000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS linhas = ROW_COUNT;
  ASSERT linhas = 0, 'AV-02: cliente atualizou a própria reunião (' || linhas || ')';
  ASSERT (SELECT status = 'agendada' AND titulo = 'Consulta' AND inicio > now()
            FROM agenda.reunioes WHERE id = 'b7000000-0000-4000-8000-000000000001'),
         'AV-02: reunião do cliente mudou';

  -- AV-03: pedido LGPD nasce 'pendente'; o cliente não informa status nem conclusão.
  BEGIN
    INSERT INTO lgpd.solicitacoes (cliente_id, tipo, status, concluido_em)
    VALUES ('a7000000-0000-4000-8000-000000000001', 'delete', 'concluida', now());
    erro := NULL;
  EXCEPTION WHEN insufficient_privilege THEN erro := 'negado';
  END;
  ASSERT erro = 'negado', 'AV-03: cliente criou pedido LGPD já concluído';

  BEGIN
    INSERT INTO lgpd.solicitacoes (cliente_id, tipo, motivo_negacao)
    VALUES ('a7000000-0000-4000-8000-000000000001', 'export', 'forjado');
    erro := NULL;
  EXCEPTION WHEN insufficient_privilege THEN erro := 'negado';
  END;
  ASSERT erro = 'negado', 'AV-03: cliente definiu motivo_negacao do próprio pedido';

  INSERT INTO lgpd.solicitacoes (cliente_id, tipo)
  VALUES ('a7000000-0000-4000-8000-000000000001', 'export');
  ASSERT (SELECT status = 'pendente' AND concluido_em IS NULL AND solicitado_em > now() - interval '1 minute'
            FROM lgpd.solicitacoes WHERE cliente_id = 'a7000000-0000-4000-8000-000000000001'),
         'AV-03: pedido legítimo do cliente deveria nascer pendente';

  -- AV-03: consentimento carrega a data do servidor, não a do cliente.
  BEGIN
    INSERT INTO lgpd.consentimentos (cliente_id, tipo, aceito, aceito_em)
    VALUES ('a7000000-0000-4000-8000-000000000001', 'marketing', true, '2020-01-01');
    erro := NULL;
  EXCEPTION WHEN insufficient_privilege THEN erro := 'negado';
  END;
  ASSERT erro = 'negado', 'AV-03: cliente forjou aceito_em retroativo';

  BEGIN
    INSERT INTO lgpd.consentimentos (cliente_id, tipo, aceito, revogado_em)
    VALUES ('a7000000-0000-4000-8000-000000000001', 'marketing', true, now());
    erro := NULL;
  EXCEPTION WHEN insufficient_privilege THEN erro := 'negado';
  END;
  ASSERT erro = 'negado', 'AV-03: cliente definiu revogado_em no INSERT';

  INSERT INTO lgpd.consentimentos (cliente_id, tipo, aceito)
  VALUES ('a7000000-0000-4000-8000-000000000001', 'marketing', true);
  ASSERT (SELECT aceito_em > now() - interval '1 minute' AND revogado_em IS NULL
            FROM lgpd.consentimentos WHERE cliente_id = 'a7000000-0000-4000-8000-000000000001'),
         'AV-03: consentimento legítimo deveria ter a data do servidor';

  -- Continua sem escrever no cliente de outro caso (cliente B).
  UPDATE crm.clientes SET case_manager = 'Hacker'
   WHERE id = 'a7000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS linhas = ROW_COUNT;
  ASSERT linhas = 0, 'cliente A atualizou o cliente B';
END $$;

-- ── Admin continua operando (regressão: a correção não pode travar a equipe) ─────────────────
SET LOCAL request.jwt.claims = '{"sub":"e7000000-0000-4000-8000-000000000099","app_metadata":{"role":"admin"}}';

DO $$
DECLARE linhas integer;
BEGIN
  UPDATE crm.clientes SET case_manager = 'Bruno'
   WHERE id = 'a7000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS linhas = ROW_COUNT;
  ASSERT linhas = 1, 'admin deveria atualizar crm.clientes';

  UPDATE agenda.reunioes SET status = 'realizada'
   WHERE id = 'b7000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS linhas = ROW_COUNT;
  ASSERT linhas = 1, 'admin deveria atualizar agenda.reunioes';

  UPDATE lgpd.solicitacoes SET status = 'concluida', concluido_em = now()
   WHERE cliente_id = 'a7000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS linhas = ROW_COUNT;
  ASSERT linhas = 1, 'admin deveria processar o pedido LGPD';
END $$;

ROLLBACK;
