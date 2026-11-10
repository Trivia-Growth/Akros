-- Description: E08-S06. Admin precisa saber quando o cliente manda mensagem no chat do portal
--              sem ficar com a tela de Comunicação aberta o dia inteiro. `comunicacao.eventos` é
--              append-only desde 0048 (nem `service_role` faz UPDATE/DELETE) — não dá pra marcar
--              "lido" no próprio evento. Esta migration cria um cursor de leitura POR ADMIN
--              (tabela separada, mutável de propósito) e a contagem de não vistas vira uma
--              consulta direta do cliente contra `comunicacao.eventos` filtrada pelo cursor —
--              nenhuma função nova precisa existir no banco.
-- Story: E08-S06
-- Created: 2026-11-09

-- Rollback:
--   DROP TABLE comunicacao.visto_admin;

CREATE TABLE comunicacao.visto_admin (
  admin_id  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  visto_em  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comunicacao.visto_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicacao.visto_admin FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON comunicacao.visto_admin TO authenticated;

-- Cada admin só lê/grava o próprio cursor — não é visão de equipe (diferente de
-- `admin_ve_todos_eventos`), é progresso de leitura individual.
CREATE POLICY "admin_ve_proprio_cursor" ON comunicacao.visto_admin
  FOR SELECT USING (
    admin_id = auth.uid() AND auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );
CREATE POLICY "admin_grava_proprio_cursor" ON comunicacao.visto_admin
  FOR INSERT WITH CHECK (
    admin_id = auth.uid() AND auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );
CREATE POLICY "admin_atualiza_proprio_cursor" ON comunicacao.visto_admin
  FOR UPDATE USING (
    admin_id = auth.uid() AND auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
  );
