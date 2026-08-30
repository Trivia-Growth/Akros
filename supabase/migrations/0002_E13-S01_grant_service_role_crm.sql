-- Description: service_role precisa de GRANT explicito em schema criado dinamicamente — Supabase
--              so concede privilegio default a service_role em `public` na criacao do projeto,
--              nao em schemas novos (achado ao tentar seed via service_role, PGRST 42501).
-- Story: E13-S01
-- Created: 2026-08-30

-- Rollback: REVOKE ALL ON ALL TABLES IN SCHEMA crm FROM service_role; REVOKE USAGE ON SCHEMA crm FROM service_role;

GRANT USAGE ON SCHEMA crm TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA crm TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA crm GRANT ALL ON TABLES TO service_role;
