-- RLS de comunicacao.visto_admin (E08-S06). Cada admin só lê/grava o próprio cursor; cliente não
-- lê nem grava nenhuma linha. Roda no job `db-tests`.

\set ON_ERROR_STOP on

INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
 ('11111111-1111-1111-1111-111111111111', 'admin1@example.test', '{"role":"admin"}'),
 ('22222222-2222-2222-2222-222222222222', 'admin2@example.test', '{"role":"admin"}'),
 ('33333333-3333-3333-3333-333333333333', 'cliente@example.test', '{"role":"cliente"}');

-- ── Admin grava o próprio cursor ────────────────────────────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","app_metadata":{"role":"admin"}}';
  INSERT INTO comunicacao.visto_admin (admin_id) VALUES ('11111111-1111-1111-1111-111111111111');
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM comunicacao.visto_admin) = 1, 'admin deveria ver o próprio cursor';
  END $$;
COMMIT;

-- ── Admin não grava cursor de outro admin ───────────────────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    BEGIN
      INSERT INTO comunicacao.visto_admin (admin_id) VALUES ('22222222-2222-2222-2222-222222222222');
      ASSERT false, 'admin NAO pode gravar cursor de outro admin';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END $$;
ROLLBACK;

-- ── Segundo admin não vê o cursor do primeiro ───────────────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM comunicacao.visto_admin) = 0, 'admin NAO pode ver cursor de outro admin';
  END $$;
COMMIT;

-- ── Cliente não vê nem grava nenhum cursor ──────────────────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM comunicacao.visto_admin) = 0, 'cliente NAO pode ver cursor de admin';
    BEGIN
      INSERT INTO comunicacao.visto_admin (admin_id) VALUES ('33333333-3333-3333-3333-333333333333');
      ASSERT false, 'cliente NAO pode gravar cursor';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END $$;
ROLLBACK;
