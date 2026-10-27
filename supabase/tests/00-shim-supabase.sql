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
--   storage.buckets / storage.objects → Supabase Storage provisiona este schema (extensão
--            própria, fora de supabase/migrations/) ANTES de qualquer migration de usuário
--            rodar — contrato mínimo reproduzido aqui pela primeira vez em 0020 (E03-S07,
--            T016-T018: primeiro uso de Storage neste repositório). CONCERN registrado no
--            relatório desta task: o shape exato de colunas/grants/RLS (FORCE ou só ENABLE?)
--            do Supabase Storage real não foi confirmado contra o projeto de verdade nesta
--            sessão — este stub é a melhor reprodução disponível, não uma cópia confirmada.

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
  email text,
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_app_meta_data jsonb DEFAULT '{}'::jsonb;

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
-- Assinaturas IDÊNTICAS às do supabase_vault 0.3.1 de produção (conferidas em 2026-10-01 com
-- pg_get_function_arguments). O shim anterior declarava 3 e 4 argumentos e deixou a 0016 passar na
-- CI com uma guarda (`to_regprocedure('vault.create_secret(text,text,text)')`) que falha no
-- Supabase real, onde a função tem 4 argumentos. Divergência de assinatura aqui é bug de CI.
CREATE OR REPLACE FUNCTION vault.create_secret(
  new_secret text,
  new_name text DEFAULT NULL,
  new_description text DEFAULT '',
  new_key_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO vault.secrets (name, decrypted_secret, description)
  VALUES (new_name, new_secret, new_description)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION vault.update_secret(
  secret_id uuid,
  new_secret text DEFAULT NULL,
  new_name text DEFAULT NULL,
  new_description text DEFAULT NULL,
  new_key_id uuid DEFAULT NULL
) RETURNS void LANGUAGE sql AS $$
  UPDATE vault.secrets
  SET decrypted_secret = coalesce(new_secret, decrypted_secret),
      name = coalesce(new_name, name),
      description = coalesce(new_description, description),
      updated_at = now()
  WHERE id = secret_id
$$;

-- Stub minimo de Supabase Storage (E03-S07, 0020 e a primeira migration deste repositorio a
-- tocar `storage`). Reproduz so o contrato que 0020 usa: `storage.buckets` (destino do INSERT
-- de T017) e `storage.objects` (destino da CREATE POLICY de INSERT). Colunas alem dessas duas
-- tabelas, e qualquer outra tabela real do Storage (storage.migrations etc.), ficam de fora de
-- proposito -- nenhuma migration deste repo as usa.
--
-- GRANT amplo a anon/authenticated/service_role nas duas tabelas, ANTES de qualquer policy
-- de usuario: e assim que o Supabase Storage real provisiona (GRANT ALL ON ALL TABLES IN
-- SCHEMA storage ao subir a extensao, fora de supabase/migrations/) -- a RLS, nao a ausencia de
-- privilegio de tabela, e o que de fato nega authenticated nesta tabela. Reproduzir o GRANT
-- largo aqui e o que torna o teste de "authenticated nao le objeto que ele mesmo enviou"
-- (08-rls-arquivos_test.sql) uma prova de RLS de verdade, nao um falso-positivo por erro de
-- privilegio de tabela.
--
-- RLS habilitada (ENABLE, NAO FORCE) nas duas: e o padrao real do Supabase Storage. FORCE nao
-- mudaria o resultado dos testes desta sessao (quem aplica a migration/shim na CI e o owner da
-- tabela via psql -U postgres, que RLS nunca restringe, com ou sem FORCE) -- mas e exatamente o
-- tipo de detalhe que esta sessao NAO confirmou contra um projeto Supabase real (ver CONCERN no
-- relatorio desta task). Se este shim um dia divergir do comportamento real, o sintoma seria
-- "teste passa aqui, falha em produção" -- igual ao que o comentario no topo deste arquivo ja
-- avisa sobre toda primitiva nova.
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id                  text PRIMARY KEY,
  name                text NOT NULL,
  owner               uuid,
  public              boolean DEFAULT false,
  file_size_limit     bigint,
  allowed_mime_types  text[],
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id   text REFERENCES storage.buckets(id),
  name        text,
  owner       uuid,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON storage.buckets, storage.objects TO anon, authenticated, service_role;
