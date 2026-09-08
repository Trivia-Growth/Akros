-- Description: Permite duplicar/criar versao de programas pela UI administrativa real (E13-S11).
-- Story: E13-S11
-- Created: 2026-09-05

-- Rollback: DROP POLICY IF EXISTS "so_admin_cria_programas" ON programas.programas;
--           REVOKE INSERT ON programas.programas FROM authenticated;

-- E13-S04 concedeu somente SELECT/UPDATE, mas ProgramasPage ja oferece "Duplicar programa".
-- INSERT e necessario para preservar a mutacao existente fora do mock; RLS continua admin-only.
GRANT INSERT ON programas.programas TO authenticated;

CREATE POLICY "so_admin_cria_programas" ON programas.programas
  FOR INSERT WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
