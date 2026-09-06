-- E13-S11: duplicar programa exige INSERT admin, sem abrir catalogo a cliente.
\set ON_ERROR_STOP on

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"15151515-1515-1515-1515-151515151515","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    BEGIN
      INSERT INTO programas.programas (
        codigo, nome, categoria, sujeito, versao, fases_template, documentos_exigidos
      ) VALUES (
        'cliente-nao-cria', 'Invasao', 'imigrante', 'individuo', '1', '[]', '[]'
      );
      ASSERT false, 'cliente nao pode criar programa';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"16161616-1616-1616-1616-161616161616","app_metadata":{"role":"admin"}}';
  INSERT INTO programas.programas (
    codigo, nome, categoria, sujeito, versao, fases_template, documentos_exigidos
  ) VALUES (
    'programa-admin-e13-s11', 'Programa admin', 'imigrante', 'individuo', '1', '[]', '[]'
  );
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM programas.programas WHERE codigo = 'programa-admin-e13-s11') = 1,
      'admin deveria criar programa';
  END $$;
COMMIT;

DO $$ BEGIN RAISE NOTICE 'E13-S11: INSERT de programas respeita RLS'; END $$;
