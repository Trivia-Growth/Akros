-- RLS por participacao + papel em documentos.documentos / jornada.fases / jornada.etapas, e
-- deny-by-default em crm.notas_internas (E03-S07, 0019). Roda no job `db-tests`.
--
-- Isto so e possivel porque `00-shim-supabase.sql` faz `auth.jwt()` ler `request.jwt.claims` do
-- settings da sessao, igual ao PostgREST do Supabase. Com o stub devolvendo NULL, toda policy
-- daria falso e o teste "passaria" provando o oposto do que parece.

\set ON_ERROR_STOP on

-- ── Semente: um caso, dois participantes (aplicante ativo, familiar_apoio que sera revogado no
--    cenario 5), uma jornada com fase liberada + fase bloqueada (cada uma com uma etapa), dois
--    documentos (um livre, um restrito ao papel 'beneficiario') e uma nota interna. Inserida
--    como owner, antes de assumir papel de aplicacao (mesma convencao de 02-rls-leads/
--    06-rls-participantes/09-a02).

INSERT INTO auth.users (id) VALUES
  ('e7111111-1111-1111-1111-111111111111'),
  ('e7222222-2222-2222-2222-222222222222');

INSERT INTO crm.clientes (id, nome, email, telefone, tipo_visto, case_manager)
VALUES ('a7111111-1111-1111-1111-111111111111', 'Cliente Teste Papel', 'papel@example.com',
        '11900000003', 'eb2-niw', 'Natalia');

-- P1: aplicante, ativo durante todo o teste (cenarios 1-3).
-- P2: familiar_apoio, ativo no cenario 5 até ser revogado no meio do proprio cenario.
INSERT INTO crm.participantes (id, cliente_id, papel, sujeito_tipo, familiar_id, auth_user_id, nome_exibicao, email)
VALUES
  ('d7000000-0000-0000-0000-000000000001', 'a7111111-1111-1111-1111-111111111111', 'aplicante', 'titular', NULL,
   'e7111111-1111-1111-1111-111111111111', 'Participante Aplicante', 'p1@example.com'),
  ('d7000000-0000-0000-0000-000000000002', 'a7111111-1111-1111-1111-111111111111', 'familiar_apoio', 'familiar',
   'fam-revogavel', 'e7222222-2222-2222-2222-222222222222', 'Participante Familiar', 'p2@example.com');

INSERT INTO jornada.jornadas (id, cliente_id)
VALUES ('b7111111-1111-1111-1111-111111111111', 'a7111111-1111-1111-1111-111111111111');

INSERT INTO jornada.fases (id, jornada_id, ordem, titulo, descricao, status)
VALUES
  ('c7111111-1111-1111-1111-111111111111', 'b7111111-1111-1111-1111-111111111111', 1,
   'Fase Liberada', 'Fase liberada para o portal', 'liberada'),
  ('c7222222-2222-2222-2222-222222222222', 'b7111111-1111-1111-1111-111111111111', 2,
   'Fase Bloqueada', 'Fase ainda bloqueada', 'bloqueada');

INSERT INTO jornada.etapas (id, fase_id, titulo, descricao, status, responsavel)
VALUES
  ('f7111111-1111-1111-1111-111111111111', 'c7111111-1111-1111-1111-111111111111',
   'Etapa da Fase Liberada', 'Descricao', 'pendente', 'cliente'),
  ('f7222222-2222-2222-2222-222222222222', 'c7222222-2222-2222-2222-222222222222',
   'Etapa da Fase Bloqueada', 'Descricao', 'pendente', 'cliente');

INSERT INTO documentos.documentos (id, cliente_id, fase_id, nome, tipo, status, restrito_ao_papel, papel_dirigido)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'a7111111-1111-1111-1111-111111111111',
   'c7111111-1111-1111-1111-111111111111', 'Documento Nao Restrito', 'generico', 'pendente', false, NULL),
  ('22222222-2222-2222-2222-222222222222', 'a7111111-1111-1111-1111-111111111111',
   'c7111111-1111-1111-1111-111111111111', 'Documento Restrito ao Beneficiario', 'generico', 'pendente',
   true, 'beneficiario');

INSERT INTO crm.notas_internas (id, cliente_id, conteudo, autor_id)
VALUES ('91111111-1111-1111-1111-111111111111', 'a7111111-1111-1111-1111-111111111111',
        'Nota interna do caso', '99999999-9999-9999-9999-999999999999');

-- ── 1. Participante ve documento NAO restrito do seu caso ───────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"e7111111-1111-1111-1111-111111111111","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM documentos.documentos WHERE id = '11111111-1111-1111-1111-111111111111') = 1,
      'participante aplicante deveria ver o documento nao restrito do proprio caso';
  END $$;
COMMIT;

-- ── 2. Participante NAO ve documento restrito a OUTRO papel -- prova por ID direto, nao so por
--      listagem (RLS filtra igual, mas e o cenario mais facil de vazar por engano) ────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"e7111111-1111-1111-1111-111111111111","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM documentos.documentos WHERE id = '22222222-2222-2222-2222-222222222222') = 0,
      'participante aplicante NAO deveria ver documento restrito ao papel beneficiario (nao tem esse papel)';
  END $$;
COMMIT;

-- ── 3. Participante NAO ve etapa de fase bloqueada -- mas a FASE em si continua visivel (so a
--      etapa fica escondida, para o cliente saber que a fase existe e esta bloqueada) ─────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"e7111111-1111-1111-1111-111111111111","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM jornada.etapas WHERE id = 'f7222222-2222-2222-2222-222222222222') = 0,
      'participante NAO deveria ver etapa de fase bloqueada';
    ASSERT (SELECT count(*) FROM jornada.etapas WHERE id = 'f7111111-1111-1111-1111-111111111111') = 1,
      'participante deveria ver etapa de fase liberada (controle positivo)';
    ASSERT (SELECT count(*) FROM jornada.fases WHERE id = 'c7222222-2222-2222-2222-222222222222') = 1,
      'a FASE bloqueada em si deveria ser visivel (so a etapa dela e escondida)';
  END $$;
COMMIT;

-- ── 4. crm.notas_internas retorna vazio para qualquer participante, mesmo filtrando pelo
--      proprio cliente_id -- 0019 nao concede GRANT a authenticated nesta tabela (admin-only,
--      mais restritivo que o padrao "GRANT + policy" usado em crm.contratos/0017): a consulta
--      erra com insufficient_privilege antes mesmo da RLS avaliar, o que e deny ainda mais forte
--      que "vazio". Os dois desfechos (erro ou zero linhas) contam como "participante nao ve". ─
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"e7111111-1111-1111-1111-111111111111","app_metadata":{"role":"cliente"}}';
  DO $$
  DECLARE v_count integer;
  BEGIN
    BEGIN
      SELECT count(*) INTO v_count FROM crm.notas_internas
      WHERE cliente_id = 'a7111111-1111-1111-1111-111111111111';
      ASSERT v_count = 0,
        'participante NAO deveria ver nenhuma nota interna, mesmo filtrando pelo proprio cliente_id';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- esperado: zero GRANT a authenticated em crm.notas_internas (0019)
    END;
  END $$;
COMMIT;

-- ── 5. Participante revogado perde a leitura que tinha antes ────────────────
-- 5a. Antes da revogacao: participante familiar_apoio (ainda ativo) le o documento nao restrito
--     do proprio caso normalmente.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"e7222222-2222-2222-2222-222222222222","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM documentos.documentos WHERE id = '11111111-1111-1111-1111-111111111111') = 1,
      'participante familiar_apoio ATIVO deveria ver o documento nao restrito do caso, antes da revogacao';
  END $$;
COMMIT;

-- 5b. Revogacao, fora do role restrito (como owner) -- mesma convencao de 06-rls-participantes
--     pra UPDATE direto de teste (nao e o fluxo de producao, que seria via Edge Function).
UPDATE crm.participantes
  SET estado = 'revogado', revogado_em = now()
  WHERE id = 'd7000000-0000-0000-0000-000000000002';

-- 5c. Depois da revogacao: a mesma consulta, pelo mesmo participante, retorna vazio -- prova que
--     a leitura some, nao so que nunca existiu.
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"e7222222-2222-2222-2222-222222222222","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM documentos.documentos WHERE id = '11111111-1111-1111-1111-111111111111') = 0,
      'participante REVOGADO NAO deveria mais ver o documento que via antes da revogacao';
  END $$;
COMMIT;

DO $$ BEGIN RAISE NOTICE 'RLS de documentos/jornada por papel + deny-by-default de crm.notas_internas: todas as asserções passaram'; END $$;
