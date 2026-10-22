-- RPCs de `envio-comandos` (E03-S07, Fase 5/US2, 0027). Roda no job `db-tests`, mesmo criterio
-- de 06/07/08/09: chama as funcoes DIRETO por SQL (sem Edge Function), como `service_role`.
-- `SET LOCAL request.jwt.claims = '{"role":"service_role"}'` (nao so `SET LOCAL ROLE
-- service_role`) e indispensavel aqui: dentro de uma funcao SECURITY DEFINER, `current_user`
-- passa a ser o DONO da funcao (quem aplicou a migration), nao o role da sessao chamadora --
-- achado empirico desta task. O fallback `coalesce(auth.jwt()->>'role', current_user)` do shim
-- so acerta 'service_role' se o claim trouxer 'role' explicito; sem isso a guarda das tres
-- funcoes rejeitaria toda chamada com 42501 mesmo com `SET LOCAL ROLE service_role` aplicado.
--
-- Tres invariantes exigidas pelo brief desta task, contra Postgres real:
--   1) arquivos.reservar_envio recusa participante sem papel_dirigido nem envio_conjunto (403).
--   2) arquivos.finalizar_envio com revisaoEsperada divergente nao grava e devolve erro (409).
--   3) Duas chamadas de arquivos.finalizar_envio para a mesma versao nao duplicam
--      arquivos.trabalhos_transferencia (COUNT(*) = 1) -- a dedup de idempotencyKey em si e
--      responsabilidade da Edge Function (comIdempotencia, provada no Deno test
--      envio-comandos.test.ts); aqui a prova e que o ESTADO/trava de revisao do banco por si so
--      ja impede um segundo INSERT em trabalhos_transferencia, defesa em profundidade caso a
--      camada de idempotencia acima seja contornada ou tenha um bug.

\set ON_ERROR_STOP on

-- ── Semente: um caso, dois participantes (aplicante e beneficiario), uma fase liberada, um
--    documento dirigido ao papel 'beneficiario' sem envio_conjunto ──────────────────────────────

INSERT INTO crm.clientes (id, nome, email, telefone, tipo_visto, case_manager)
VALUES ('90000000-0000-0000-0000-000000000001', 'Cliente Teste Envio', 'envio@example.com',
        '11900000005', 'eb2-niw', 'Natalia');

INSERT INTO crm.participantes (id, cliente_id, papel, sujeito_tipo, auth_user_id, nome_exibicao, email)
VALUES
  ('90000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001',
   'aplicante', 'titular', '90000000-0000-0000-0000-00000000000a', 'Participante Aplicante',
   'aplicante@example.com'),
  ('90000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000001',
   'beneficiario', 'titular', '90000000-0000-0000-0000-00000000000b', 'Participante Beneficiario',
   'beneficiario@example.com');

INSERT INTO jornada.jornadas (id, cliente_id)
VALUES ('90000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000001');

INSERT INTO jornada.fases (id, jornada_id, ordem, titulo, descricao, status)
VALUES ('90000000-0000-0000-0000-000000000005', '90000000-0000-0000-0000-000000000004', 1,
        'Fase Liberada', 'Fase liberada para o portal', 'liberada');

-- Documento dirigido EXCLUSIVAMENTE ao papel 'beneficiario', sem envio_conjunto.
INSERT INTO documentos.documentos (
  id, cliente_id, fase_id, nome, tipo, status, restrito_ao_papel, papel_dirigido, envio_conjunto
)
VALUES (
  '90000000-0000-0000-0000-000000000006', '90000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000005', 'Documento Dirigido ao Beneficiario', 'generico',
  'pendente', true, 'beneficiario', false
);

-- ── 1. reservar_envio recusa o participante 'aplicante' (papel nao casa, sem envio_conjunto) --
--      403 (insufficient_privilege, ERRCODE 42501) -- e aceita o 'beneficiario' correto ────────
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  DO $$
  BEGIN
    BEGIN
      PERFORM * FROM arquivos.reservar_envio(
        '90000000-0000-0000-0000-000000000006', NULL, 'passaporte.pdf', 123456,
        'application/pdf', false, '90000000-0000-0000-0000-00000000000a'
      );
      RAISE EXCEPTION 'nao deveria ter permitido o participante aplicante reservar envio para documento dirigido ao beneficiario';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- esperado: papel sem autoridade (ERRCODE 42501 -> 403 na Edge Function)
    END;
  END $$;
ROLLBACK;

BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  DO $$
  DECLARE
    v_count integer;
  BEGIN
    PERFORM * FROM arquivos.reservar_envio(
      '90000000-0000-0000-0000-000000000006', NULL, 'passaporte.pdf', 123456,
      'application/pdf', false, '90000000-0000-0000-0000-00000000000b'
    );
    SELECT count(*) INTO v_count FROM arquivos.versoes WHERE documento_id = '90000000-0000-0000-0000-000000000006';
    ASSERT v_count = 1, 'participante beneficiario (papel correto) deveria conseguir reservar envio (controle positivo)';
  END $$;
COMMIT;

-- ── 2. finalizar_envio com revisaoEsperada divergente nao grava e devolve erro (409, ERRCODE
--      40001/serialization_failure) -- a versao permanece 'reservada', sem trabalho de
--      transferencia criado ─────────────────────────────────────────────────────────────────────
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  DO $$
  DECLARE
    v_versao_id uuid;
  BEGIN
    SELECT versao_id INTO v_versao_id
    FROM arquivos.reservar_envio(
      '90000000-0000-0000-0000-000000000006', NULL, 'passaporte-v2.pdf', 123456,
      'application/pdf', false, '90000000-0000-0000-0000-00000000000b'
    );

    BEGIN
      PERFORM * FROM arquivos.finalizar_envio(v_versao_id, 999, '90000000-0000-0000-0000-00000000000b');
      RAISE EXCEPTION 'nao deveria ter permitido finalizar_envio com revisaoEsperada divergente';
    EXCEPTION WHEN serialization_failure THEN
      NULL; -- esperado: revisao divergente (ERRCODE 40001 -> 409 na Edge Function)
    END;

    ASSERT (SELECT estado_recebimento FROM arquivos.versoes WHERE id = v_versao_id) = 'reservada',
      'versao NAO deveria ter mudado de estado apos finalizar_envio com revisao divergente';
    ASSERT (SELECT count(*) FROM arquivos.trabalhos_transferencia WHERE versao_id = v_versao_id) = 0,
      'nenhum trabalho de transferencia deveria ter sido criado apos finalizar_envio recusado';
  END $$;
ROLLBACK;

-- ── 3. Duas chamadas de finalizar_envio para a MESMA versao nao duplicam
--      arquivos.trabalhos_transferencia -- a primeira chamada sucede (revisao 1 -> 2); a
--      segunda, com a revisaoEsperada original (1), agora diverge da atual (2) e e recusada pelo
--      mesmo mecanismo do cenario 2 -- prova que o estado do banco, sozinho, ja impede o
--      segundo INSERT em trabalhos_transferencia (COUNT(*) = 1), defesa em profundidade alem da
--      dedup de idempotencyKey da Edge Function ───────────────────────────────────────────────
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  DO $$
  DECLARE
    v_versao_id uuid;
  BEGIN
    SELECT versao_id INTO v_versao_id
    FROM arquivos.reservar_envio(
      '90000000-0000-0000-0000-000000000006', NULL, 'passaporte-v3.pdf', 123456,
      'application/pdf', false, '90000000-0000-0000-0000-00000000000b'
    );

    PERFORM * FROM arquivos.finalizar_envio(v_versao_id, 1, '90000000-0000-0000-0000-00000000000b');

    BEGIN
      PERFORM * FROM arquivos.finalizar_envio(v_versao_id, 1, '90000000-0000-0000-0000-00000000000b');
      RAISE EXCEPTION 'segunda chamada deveria ter sido recusada (versao ja recebida, revisao avancou)';
    EXCEPTION WHEN object_not_in_prerequisite_state THEN
      -- esperado: a versao ja saiu de 'reservada' na primeira chamada (checado ANTES da
      -- revisao em finalizar_envio) -- o mesmo CONFLITO de concorrencia que o cenario 2 prova
      -- com revisaoEsperada divergente, so que aqui pela via "estado ja mudou" em vez de
      -- "revisao nao bate": as duas sao formas de 409 na Edge Function (ver erroDeNegocio).
      NULL;
    END;

    ASSERT (SELECT count(*) FROM arquivos.trabalhos_transferencia WHERE versao_id = v_versao_id) = 1,
      'duas chamadas de finalizar_envio para a mesma versao NAO deveriam duplicar trabalhos_transferencia';
    ASSERT (SELECT status FROM documentos.documentos WHERE id = '90000000-0000-0000-0000-000000000006') = 'enviado',
      'documento deveria estar enviado apos a primeira finalizacao bem-sucedida';
  END $$;
ROLLBACK;

DO $$ BEGIN RAISE NOTICE 'RPCs de envio-comandos (reservar_envio/finalizar_envio): todas as asserções passaram'; END $$;
