-- RLS de crm.leads (E13-S09, AC-1). Roda no job `db-tests`.
--
-- Isto so e possivel porque `00-shim-supabase.sql` faz `auth.jwt()` ler `request.jwt.claims` do
-- settings da sessao, igual ao PostgREST do Supabase. Com o stub devolvendo NULL, toda policy
-- daria falso e o teste "passaria" provando o oposto do que parece.

\set ON_ERROR_STOP on

-- Semente inserida como owner, antes de assumir papel de aplicacao.
INSERT INTO crm.leads (id, nome, email, telefone, origem, tipo_visto_interesse)
VALUES ('11111111-1111-1111-1111-111111111111', 'Lead Teste', 'lead@example.com',
        '11999999999', 'site', 'eb2-niw');

-- ── Admin ve o lead ─────────────────────────────────────────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM crm.leads) = 1, 'admin deveria enxergar o lead';
  END $$;
COMMIT;

-- ── Cliente NAO ve o lead, e recebe vazio em vez de erro ────────────────────
-- Zero policy de cliente e deliberado: devolver [] nao vaza nem a existencia da tabela.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","app_metadata":{"role":"cliente","cliente_id":"44444444-4444-4444-4444-444444444444"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM crm.leads) = 0, 'cliente NAO pode enxergar lead';
  END $$;
COMMIT;

-- ── Cliente nao consegue criar lead ─────────────────────────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    BEGIN
      INSERT INTO crm.leads (nome, email, telefone, origem, tipo_visto_interesse)
      VALUES ('Invasor', 'x@example.com', '11', 'site', 'eb2-niw');
      ASSERT false, 'cliente NAO pode inserir lead';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- comportamento esperado
    END;
  END $$;
COMMIT;

-- ── Anon nao consegue furar a function e inserir direto na tabela ──────────
BEGIN;
  SET LOCAL ROLE anon;
  DO $$
  BEGIN
    BEGIN
      INSERT INTO crm.leads (nome, email, telefone, origem, tipo_visto_interesse)
      VALUES ('Spam', 'spam@example.com', '11', 'site', 'eb2-niw');
      ASSERT false, 'anon NAO pode inserir lead direto';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- comportamento esperado; criacao publica passa por lead-capturar
    END;
  END $$;
COMMIT;

-- ── Conversao admin cria cliente e fecha lead na mesma transacao ────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","app_metadata":{"role":"admin"}}';
  DO $$
  DECLARE
    v_cliente_id uuid;
  BEGIN
    SELECT id INTO v_cliente_id
    FROM crm.criar_cliente_a_partir_de_lead(
      '11111111-1111-1111-1111-111111111111',
      'eb2-niw'
    );

    ASSERT v_cliente_id IS NOT NULL, 'conversao deveria devolver cliente';
    ASSERT (
      SELECT count(*) FROM crm.clientes
      WHERE id = v_cliente_id
        AND lead_origem_id = '11111111-1111-1111-1111-111111111111'
        AND programa_id = 'eb2-niw'
    ) = 1, 'cliente deveria copiar lead e programa';
    ASSERT (
      SELECT estagio FROM crm.leads
      WHERE id = '11111111-1111-1111-1111-111111111111'
    ) = 'fechado', 'lead deveria fechar na mesma transacao';
  END $$;
COMMIT;

-- ── Cliente nao pode usar RPC SECURITY DEFINER para elevar privilegio ───────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    BEGIN
      PERFORM crm.criar_cliente_a_partir_de_lead(
        '11111111-1111-1111-1111-111111111111',
        'eb2-niw'
      );
      ASSERT false, 'cliente NAO pode converter lead';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- guarda interna da SECURITY DEFINER funcionou
    END;
  END $$;
COMMIT;

-- ── Ninguem apaga lead (nao ha policy de DELETE) ────────────────────────────
-- Apagar destruiria a base de reativacao (E11-S05) e a trilha de auditoria.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    DELETE FROM crm.leads WHERE id = '11111111-1111-1111-1111-111111111111';
    ASSERT (SELECT count(*) FROM crm.leads WHERE id = '11111111-1111-1111-1111-111111111111') = 1,
      'nem admin pode apagar lead — nao existe policy de DELETE';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- tambem aceitavel: barrado pelo GRANT antes da policy
  END $$;
COMMIT;

-- ── A FK de conversao vale para linha nova ──────────────────────────────────
DO $$
BEGIN
  BEGIN
    INSERT INTO crm.clientes (nome, email, telefone, tipo_visto, case_manager, lead_origem_id)
    VALUES ('X', 'x@example.com', '11', 'eb2-niw', 'Natalia',
            '99999999-9999-9999-9999-999999999999');
    ASSERT false, 'lead_origem_id inexistente deveria violar a FK';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL; -- comportamento esperado
  END;
END $$;

DO $$ BEGIN RAISE NOTICE 'RLS de crm.leads: todas as asserções passaram'; END $$;
