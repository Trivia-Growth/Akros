-- RLS de crm.participantes / crm.contratos / crm.contrato_condicoes / crm.organizacoes
-- (E03-S07, ADR-0018). Roda no job `db-tests`.
--
-- Isto so e possivel porque `00-shim-supabase.sql` faz `auth.jwt()` ler `request.jwt.claims` do
-- settings da sessao, igual ao PostgREST do Supabase. Com o stub devolvendo NULL, toda policy
-- daria falso e o teste "passaria" provando o oposto do que parece.

\set ON_ERROR_STOP on

-- ── Semente: dois clientes/casos, dois participantes cada, um contrato+condicao no caso A ──
-- Inserida como owner, antes de assumir papel de aplicacao (mesma convencao de 02-rls-leads).

INSERT INTO crm.clientes (id, nome, email, telefone, tipo_visto, case_manager)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Cliente Caso A', 'casoa@example.com', '11900000001', 'eb2-niw', 'Natalia'),
  ('b2222222-2222-2222-2222-222222222222', 'Cliente Caso B', 'casob@example.com', '11900000002', 'eb2-niw', 'Natalia');

UPDATE crm.clientes SET perfil_imigratorio = '{"familiares":[{"id":"fam-a2"}]}'::jsonb WHERE id = 'a1111111-1111-1111-1111-111111111111';
UPDATE crm.clientes SET perfil_imigratorio = '{"familiares":[{"id":"fam-b2"}]}'::jsonb WHERE id = 'b2222222-2222-2222-2222-222222222222';

INSERT INTO crm.organizacoes (id, nome)
VALUES ('c3333333-3333-3333-3333-333333333333', 'Organizacao Teste');

-- Caso A: aplicante (titular) + familiar de apoio. Caso B: o mesmo par, isolado.
INSERT INTO crm.participantes (id, cliente_id, papel, sujeito_tipo, familiar_id, auth_user_id, nome_exibicao, email)
VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'aplicante', 'titular', NULL, 'e1000000-0000-0000-0000-000000000001', 'Participante A1', 'a1@example.com'),
  ('d1000000-0000-0000-0000-000000000002', 'a1111111-1111-1111-1111-111111111111', 'familiar_apoio', 'familiar', 'fam-a2', 'e1000000-0000-0000-0000-000000000002', 'Participante A2', 'a2@example.com'),
  ('d2000000-0000-0000-0000-000000000001', 'b2222222-2222-2222-2222-222222222222', 'aplicante', 'titular', NULL, 'e2000000-0000-0000-0000-000000000001', 'Participante B1', 'b1@example.com'),
  ('d2000000-0000-0000-0000-000000000002', 'b2222222-2222-2222-2222-222222222222', 'familiar_apoio', 'familiar', 'fam-b2', 'e2000000-0000-0000-0000-000000000002', 'Participante B2', 'b2@example.com');

INSERT INTO crm.contratos (id, cliente_id, programa_id, programa_versao, prazo_resposta_dias_uteis, registrado_por)
VALUES ('f1000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'eb2-niw', 'v1', 30,
        '99999999-9999-9999-9999-999999999999');

INSERT INTO crm.contrato_condicoes (id, contrato_id, descricao, tipo, valor, moeda, vencimento, ordem)
VALUES ('f2000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Entrada', 'entrada',
        1500.00, 'USD', '2026-11-01', 1);

-- ── 1. Admin ve todas as linhas das 4 tabelas ───────────────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM crm.participantes) = 4, 'admin deveria ver os 4 participantes';
    ASSERT (SELECT count(*) FROM crm.contratos) = 1, 'admin deveria ver o contrato';
    ASSERT (SELECT count(*) FROM crm.contrato_condicoes) = 1, 'admin deveria ver a condicao do contrato';
    ASSERT (SELECT count(*) FROM crm.organizacoes) = 1, 'admin deveria ver a organizacao';
  END $$;
COMMIT;

-- ── 2. Participante do caso A ve os participantes do caso A (os dois papeis),
--      e NAO ve nenhuma linha do caso B ──────────────────────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"e1000000-0000-0000-0000-000000000001","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM crm.participantes) = 2,
      'participante do caso A deveria ver exatamente os 2 participantes do proprio caso';
    ASSERT (SELECT count(*) FROM crm.participantes WHERE cliente_id = 'a1111111-1111-1111-1111-111111111111') = 2,
      'os dois participantes do caso A (papeis diferentes) devem estar visiveis um pro outro';
    ASSERT (SELECT count(*) FROM crm.participantes WHERE papel = 'familiar_apoio'
            AND cliente_id = 'a1111111-1111-1111-1111-111111111111') = 1,
      'participante aplicante do caso A deveria ver o familiar_apoio do MESMO caso';
    ASSERT (SELECT count(*) FROM crm.participantes WHERE cliente_id = 'b2222222-2222-2222-2222-222222222222') = 0,
      'participante do caso A NAO pode ver nenhuma linha do caso B';
  END $$;
COMMIT;

-- ── 3. Participante do caso A NAO le crm.contratos nem crm.contrato_condicoes
--      do proprio caso -- retorna vazio, nao erro (zero policy de participante,
--      GRANT SELECT existe -- mesmo padrao de crm.leads em 0011) ──────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"e1000000-0000-0000-0000-000000000001","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM crm.contratos) = 0,
      'participante NAO pode ler contratos, nem o do proprio caso -- deveria ser vazio, nao erro';
    ASSERT (SELECT count(*) FROM crm.contrato_condicoes) = 0,
      'participante NAO pode ler condicoes de contrato -- deveria ser vazio, nao erro';
  END $$;
COMMIT;

-- ── 4. UPDATE de um participante na propria linha de crm.participantes e negado
--      -- com releitura depois da tentativa, provando que nada mudou ──────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"e1000000-0000-0000-0000-000000000001","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    BEGIN
      UPDATE crm.participantes SET nome_exibicao = 'Nome Alterado Pelo Proprio Participante'
      WHERE id = 'd1000000-0000-0000-0000-000000000001';
      ASSERT false, 'participante NAO pode atualizar a propria linha (sem GRANT UPDATE a authenticated nesta migration)';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- esperado: 0017 nao concede UPDATE a authenticated em crm.participantes
    END;
  END $$;
COMMIT;

-- Releitura (fora do role restrito, como owner) -- prova que a tentativa de UPDATE acima nao
-- mudou nada. Um UPDATE bloqueado sem releitura nao prova nada (convencao do projeto, ver 0005).
DO $$
BEGIN
  ASSERT (SELECT nome_exibicao FROM crm.participantes WHERE id = 'd1000000-0000-0000-0000-000000000001')
    = 'Participante A1',
    'nome_exibicao NAO deveria ter mudado -- o UPDATE negado acima deveria ter sido um no-op';
END $$;

DO $$ BEGIN RAISE NOTICE 'RLS de crm.participantes/contratos/contrato_condicoes/organizacoes: todas as asserções passaram'; END $$;
