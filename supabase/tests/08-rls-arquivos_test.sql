-- RLS do schema `arquivos` (E03-S07, 0020) e da policy de INSERT em `storage.objects` do bucket
-- `envios`. Roda no job `db-tests`.
--
-- Isto so e possivel porque `00-shim-supabase.sql` faz `auth.jwt()` ler `request.jwt.claims` do
-- settings da sessao, igual ao PostgREST do Supabase (mesma convencao de 06/07/09), e porque o
-- mesmo shim reproduz um contrato minimo de `storage.buckets`/`storage.objects` (primeira vez
-- que este repositorio usa Supabase Storage -- ver CONCERN no relatorio desta task sobre o que
-- NAO foi confirmado contra o Supabase real).

\set ON_ERROR_STOP on

-- ── Semente: um caso, um participante (aplicante), uma fase liberada, dois documentos (um
--    livre, um restrito ao papel 'beneficiario') cada um com sua versao em arquivos.versoes,
--    mais uma integracao Microsoft/reserva/trabalho de transferencia (tabelas admin-only) ─────

INSERT INTO crm.clientes (id, nome, email, telefone, tipo_visto, case_manager)
VALUES ('80000000-0000-0000-0000-000000000001', 'Cliente Teste Arquivos', 'arquivos@example.com',
        '11900000004', 'eb2-niw', 'Natalia');

-- Participante aplicante -- NAO tem o papel 'beneficiario', usado no cenario 2.
INSERT INTO crm.participantes (id, cliente_id, papel, sujeito_tipo, auth_user_id, nome_exibicao, email)
VALUES ('80000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001',
        'aplicante', 'titular', '80000000-0000-0000-0000-00000000000e', 'Participante Aplicante',
        'participante@example.com');

INSERT INTO jornada.jornadas (id, cliente_id)
VALUES ('80000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000001');

INSERT INTO jornada.fases (id, jornada_id, ordem, titulo, descricao, status)
VALUES ('80000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000003', 1,
        'Fase Liberada', 'Fase liberada para o portal', 'liberada');

-- Documento NAO restrito (controle positivo do cenario 2) + sua versao.
INSERT INTO documentos.documentos (id, cliente_id, fase_id, nome, tipo, status, restrito_ao_papel, papel_dirigido)
VALUES ('80000000-0000-0000-0000-000000000010', '80000000-0000-0000-0000-000000000001',
        '80000000-0000-0000-0000-000000000004', 'Documento Nao Restrito', 'generico', 'pendente',
        false, NULL);

INSERT INTO arquivos.versoes (id, cliente_id, documento_id, numero_versao, nome_original, mime,
  tamanho_bytes, estado_recebimento, enviado_por)
VALUES ('80000000-0000-0000-0000-000000000011', '80000000-0000-0000-0000-000000000001',
        '80000000-0000-0000-0000-000000000010', 1, 'documento-livre.pdf', 'application/pdf',
        123456, 'recebida', '80000000-0000-0000-0000-00000000000e');

-- Documento restrito ao papel 'beneficiario' (cenario 2, caso negativo) + sua versao.
INSERT INTO documentos.documentos (id, cliente_id, fase_id, nome, tipo, status, restrito_ao_papel, papel_dirigido)
VALUES ('80000000-0000-0000-0000-000000000005', '80000000-0000-0000-0000-000000000001',
        '80000000-0000-0000-0000-000000000004', 'Documento Restrito ao Beneficiario', 'generico',
        'pendente', true, 'beneficiario');

INSERT INTO arquivos.versoes (id, cliente_id, documento_id, numero_versao, nome_original, mime,
  tamanho_bytes, estado_recebimento, enviado_por)
VALUES ('80000000-0000-0000-0000-000000000006', '80000000-0000-0000-0000-000000000001',
        '80000000-0000-0000-0000-000000000005', 1, 'documento-restrito.pdf', 'application/pdf',
        123456, 'recebida', '80000000-0000-0000-0000-00000000000e');

-- Tabelas admin-only (cenario 1): uma integracao, uma reserva e um trabalho de transferencia,
-- todos ligados a versao NAO restrita acima (o destino nao importa para o cenario 1 -- o que
-- importa e que as 3 tabelas sao admin-only independente do conteudo).
INSERT INTO arquivos.integracoes_microsoft (id, conta_email, drive_id, pasta_raiz_item_id, escopos,
  estado, conectado_por)
VALUES ('80000000-0000-0000-0000-000000000007', 'onedrive@akros.example.com', 'drive-1', 'item-raiz-1',
        ARRAY['Files.ReadWrite'], 'conectada', '80000000-0000-0000-0000-0000000000ad');

INSERT INTO arquivos.reservas_envio (id, versao_id, objeto_permitido, tamanho_declarado,
  mime_declarado, idempotency_key, expira_em, criada_por)
VALUES ('80000000-0000-0000-0000-000000000008', '80000000-0000-0000-0000-000000000011',
        '80000000-0000-0000-0000-000000000001/80000000-0000-0000-0000-000000000011.pdf', 123456,
        'application/pdf', 'idem-80000000-0011', now() + interval '24 hours',
        '80000000-0000-0000-0000-00000000000e');

INSERT INTO arquivos.trabalhos_transferencia (id, versao_id)
VALUES ('80000000-0000-0000-0000-000000000009', '80000000-0000-0000-0000-000000000011');

-- ── 1. arquivos.reservas_envio / trabalhos_transferencia / integracoes_microsoft retornam
--      vazio para participante (admin-only, zero policy de participante) -- com controle
--      positivo de que admin ve as 3 ─────────────────────────────────────────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"80000000-0000-0000-0000-00000000000e","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM arquivos.reservas_envio) = 0,
      'participante NAO deveria ver nenhuma linha de arquivos.reservas_envio (admin-only)';
    ASSERT (SELECT count(*) FROM arquivos.trabalhos_transferencia) = 0,
      'participante NAO deveria ver nenhuma linha de arquivos.trabalhos_transferencia (admin-only)';
    ASSERT (SELECT count(*) FROM arquivos.integracoes_microsoft) = 0,
      'participante NAO deveria ver nenhuma linha de arquivos.integracoes_microsoft (admin-only)';
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"80000000-0000-0000-0000-0000000000ad","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM arquivos.reservas_envio) = 1,
      'admin deveria ver a reserva de envio semeada (controle positivo)';
    ASSERT (SELECT count(*) FROM arquivos.trabalhos_transferencia) = 1,
      'admin deveria ver o trabalho de transferencia semeado (controle positivo)';
    ASSERT (SELECT count(*) FROM arquivos.integracoes_microsoft) = 1,
      'admin deveria ver a integracao Microsoft semeada (controle positivo)';
  END $$;
COMMIT;

-- ── 2. Versao de documento restrito a OUTRO papel nao e lida em arquivos.versoes -- prova por
--      ID direto, com controle positivo da versao do documento NAO restrito ─────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"80000000-0000-0000-0000-00000000000e","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM arquivos.versoes WHERE id = '80000000-0000-0000-0000-000000000011') = 1,
      'participante aplicante deveria ver a versao do documento NAO restrito (controle positivo)';
    ASSERT (SELECT count(*) FROM arquivos.versoes WHERE id = '80000000-0000-0000-0000-000000000006') = 0,
      'participante aplicante NAO deveria ver a versao do documento restrito ao papel beneficiario';
  END $$;
COMMIT;

-- ── 3. INSERT em storage.objects com `name` que NAO corresponde a nenhuma reserva ativa e
--      negado -- RLS sem policy de INSERT casando rejeita com "insufficient_privilege" (mesmo
--      codigo que "new row violates row-level security policy for table"). ROLLBACK: tentativa
--      negada nao deve deixar rastro para os cenarios seguintes ───────────────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"80000000-0000-0000-0000-00000000000e","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    BEGIN
      INSERT INTO storage.objects (bucket_id, name) VALUES ('envios', 'nao-corresponde-a-nenhuma-reserva.pdf');
      RAISE EXCEPTION 'nao deveria ter permitido INSERT em storage.objects sem reserva correspondente';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- esperado: RLS nega o INSERT ("new row violates row-level security policy")
    END;
  END $$;
ROLLBACK;

-- ── 4. Participante nao le (SELECT) objeto do bucket `envios`, mesmo um que ele mesmo enviou
--      -- INSERT com `name` igual ao `objeto_permitido` da reserva ativa dele proprio passa a
--      policy de INSERT, mas a mesma sessao, no mesmo participante, le zero linhas de volta: a
--      ausencia de policy de SELECT nega mesmo a propria linha recem-inserida. ROLLBACK ao
--      final para nao deixar o objeto persistido para os testes seguintes (09) ───────────────
INSERT INTO arquivos.versoes (id, cliente_id, documento_id, numero_versao, nome_original, mime,
  tamanho_bytes, estado_recebimento, enviado_por)
VALUES ('80000000-0000-0000-0000-000000000012', '80000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000010', 2, 'novo.pdf', 'application/pdf', 123456,
  'reservada', '80000000-0000-0000-0000-00000000000e');
INSERT INTO arquivos.reservas_envio (versao_id, objeto_permitido, tamanho_declarado, mime_declarado,
  idempotency_key, expira_em, criada_por)
VALUES ('80000000-0000-0000-0000-000000000012',
  '80000000-0000-0000-0000-000000000001/80000000-0000-0000-0000-000000000012.pdf', 123456,
  'application/pdf', 'idem-80000000-0012', now() + interval '24 hours',
  '80000000-0000-0000-0000-00000000000e');
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"80000000-0000-0000-0000-00000000000e","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
      VALUES ('envios', '80000000-0000-0000-0000-000000000001/80000000-0000-0000-0000-000000000012.pdf');
    ASSERT (SELECT count(*) FROM storage.objects
            WHERE name = '80000000-0000-0000-0000-000000000001/80000000-0000-0000-0000-000000000012.pdf') = 0,
      'participante NAO deveria conseguir ler (SELECT) o objeto que ele mesmo acabou de enviar ao bucket envios';
  END $$;
ROLLBACK;

DO $$ BEGIN RAISE NOTICE 'RLS de arquivos.* e da policy de INSERT em storage.objects (bucket envios): todas as asserções passaram'; END $$;
