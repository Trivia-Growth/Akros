-- Shim mínimo do ambiente Supabase, para o job `db-tests` da CI aplicar as migrations num
-- Postgres limpo. NÃO é aplicado em produção — vive em supabase/tests/, fora de
-- supabase/migrations/, e o Supabase CLI nunca o executa.
--
-- Existe porque as migrations dependem de primitivas que o Supabase provisiona antes da primeira
-- migration rodar. Listar aqui torna essa dependência explícita: hoje são exatamente estas, e se
-- uma migration nova usar outra, o job quebra e alguém precisa decidir conscientemente.
--
--   auth.uid()   → id do usuário autenticado, lido do claim `sub` (5 usos)
--   auth.jwt()   → claims do token, de onde sai `cliente_id` e `role` (28 usos, ADR-0009)
--   auth.users   → tabela de usuários do Supabase Auth (1 referência)
--   roles authenticated / anon / service_role → alvos de GRANT (55 usos)
--   Vault → cifra real em produção; substituto mínimo só para provar migrations/RLS na imagem
--            postgres pura da CI (E13-S12).

CREATE SCHEMA IF NOT EXISTS auth;

-- Os stubs leem `request.jwt.claims` do settings da sessao, que e EXATAMENTE o que o PostgREST
-- do Supabase faz. Isso torna as policies testaveis na CI: o teste faz
-- `SET LOCAL request.jwt.claims = '...'` mais `SET LOCAL ROLE authenticated` e a RLS avalia de
-- verdade. Sem isso os stubs devolveriam NULL, toda policy daria falso, e o teste provaria o
-- oposto do que parece provar.
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
  LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb
  $$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE AS $$
    SELECT nullif(auth.jwt() ->> 'sub', '')::uuid
  $$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
  LANGUAGE sql STABLE AS $$
    SELECT coalesce(auth.jwt() ->> 'role', current_user)
  $$;

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

-- Supabase concede acesso às helpers de `auth` para os papéis da API. Sem estes GRANTs, uma
-- policy que chama `auth.uid()` falha com `permission denied for schema auth` em vez de avaliar
-- true/false — diferença silenciosa entre o shim da CI e o ambiente real.
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid(), auth.role() TO anon, authenticated, service_role;

-- O servidor Supabase contém supabase_vault. A imagem postgres:17 usada na CI não contém a
-- extensão, portanto este mock reproduz somente o contrato de UUID + valor decifrado usado pelas
-- migrations. Nunca é aplicado no projeto Supabase.
CREATE SCHEMA IF NOT EXISTS vault;
CREATE TABLE vault.secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE,
  decrypted_secret text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE VIEW vault.decrypted_secrets AS
  SELECT id, name, decrypted_secret, description, created_at, updated_at FROM vault.secrets;
CREATE OR REPLACE FUNCTION vault.create_secret(p_secret text, p_name text DEFAULT NULL, p_description text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO vault.secrets (name, decrypted_secret, description) VALUES (p_name, p_secret, p_description)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION vault.update_secret(p_id uuid, p_secret text, p_name text DEFAULT NULL, p_description text DEFAULT NULL)
RETURNS void LANGUAGE sql AS $$
  UPDATE vault.secrets
  SET decrypted_secret = p_secret, name = p_name, description = p_description, updated_at = now()
  WHERE id = p_id
$$;
