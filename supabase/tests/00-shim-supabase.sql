-- Shim mínimo do ambiente Supabase, para o job `db-tests` da CI aplicar as migrations num
-- Postgres limpo. NÃO é aplicado em produção — vive em supabase/tests/, fora de
-- supabase/migrations/, e o Supabase CLI nunca o executa.
--
-- Existe porque as migrations dependem de primitivas que o Supabase provisiona antes da primeira
-- migration rodar. Listar aqui torna essa dependência explícita: hoje são exatamente estas, e se
-- uma migration nova usar outra, o job quebra e alguém precisa decidir conscientemente.
--
--   auth.uid()   → id do usuário autenticado (5 usos)
--   auth.jwt()   → claims do token, de onde sai `cliente_id` e `role` (28 usos, ADR-0009)
--   auth.users   → tabela de usuários do Supabase Auth (1 referência)
--   roles authenticated / anon / service_role → alvos de GRANT (55 usos)

CREATE SCHEMA IF NOT EXISTS auth;

-- Os stubs devolvem NULL: o job prova que o SCHEMA aplica do zero, não o comportamento das
-- policies. Asserção de RLS é pgTAP e depende de poder autenticar de verdade — ver
-- docs/SECURITY_DEBT.md, "RLS sem teste automatizado no CI".
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
  LANGUAGE sql STABLE AS $$ SELECT NULL::jsonb $$;

CREATE TABLE IF NOT EXISTS auth.users (
  id    uuid PRIMARY KEY,
  email text
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$$;
