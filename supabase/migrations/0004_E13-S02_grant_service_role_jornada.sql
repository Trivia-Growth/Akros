-- Description: service_role precisa de GRANT explicito em schema novo (mesmo gap achado e
--              documentado em E13-S01 — Supabase so concede privilegio default em `public`).
-- Story: E13-S02
-- Created: 2026-08-30

-- Rollback: REVOKE ALL ON ALL TABLES IN SCHEMA jornada FROM service_role; REVOKE EXECUTE ON FUNCTION crm.meu_cliente_id() FROM service_role; REVOKE USAGE ON SCHEMA jornada FROM service_role;

GRANT USAGE ON SCHEMA jornada TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA jornada TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA jornada GRANT ALL ON TABLES TO service_role;
