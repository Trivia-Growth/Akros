-- arquivos.vincular_pasta (T056) e o unico indice vinculos_pasta_folder_unico_idx (T057,
-- migration 0026). Roda no job `db-tests`.
--
-- Prova por Postgres real, nao por inspecao de codigo: o MESMO folder_item_id (dentro da MESMA
-- integracao/drive) nao pode ser vinculado a dois jornada_id diferentes -- so
-- UNIQUE(cliente_id, jornada_id), de 0020, nao bastava para isso (fechava so duplicata para o
-- MESMO caso). 0026 adiciona vinculos_pasta_folder_unico_idx (integracao_id, drive_id,
-- folder_item_id); a RPC relanca o unique_violation (23505) sem capturar -- e
-- `_shared/caso-comandos.ts` (erroDeNegocio) mapeia para 409, provado nos testes Deno
-- (caso-comandos.test.ts, "vincular_pasta: RPC recusa com 23505").

\set ON_ERROR_STOP on

-- ── Semente: uma integracao Microsoft, dois clientes/casos distintos, uma jornada cada ──────
-- Inserida como owner, antes de assumir papel de aplicacao (mesma convencao de 02-rls-leads).

INSERT INTO arquivos.integracoes_microsoft (id, conta_email, drive_id, pasta_raiz_item_id, escopos,
  estado, conectado_por)
VALUES ('90000000-0000-0000-0000-000000000001', 'onedrive@akros.example.com', 'drive-unico-1',
        'item-raiz-unico-1', ARRAY['Files.ReadWrite', 'offline_access'], 'conectada',
        '90000000-0000-0000-0000-0000000000ad');

INSERT INTO crm.clientes (id, nome, email, telefone, tipo_visto, case_manager)
VALUES
  ('90000000-0000-0000-0000-000000000011', 'Cliente Pasta A', 'pastaA@example.com', '11900000011', 'eb2-niw', 'Natalia'),
  ('90000000-0000-0000-0000-000000000012', 'Cliente Pasta B', 'pastaB@example.com', '11900000012', 'eb2-niw', 'Natalia');

INSERT INTO jornada.jornadas (id, cliente_id)
VALUES
  ('90000000-0000-0000-0000-000000000021', '90000000-0000-0000-0000-000000000011'),
  ('90000000-0000-0000-0000-000000000022', '90000000-0000-0000-0000-000000000012');

-- ── 1. Primeiro vínculo (caso A) é aceito e devolve a linha gravada ─────────────────────────
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  DO $$
  DECLARE
    v_vinculo arquivos.vinculos_pasta;
  BEGIN
    SELECT * INTO v_vinculo FROM arquivos.vincular_pasta(
      '90000000-0000-0000-0000-000000000011'::uuid, -- p_cliente_id (caso A)
      '90000000-0000-0000-0000-000000000021'::uuid, -- p_jornada_id (caso A)
      '90000000-0000-0000-0000-000000000001'::uuid, -- p_integracao_id
      'pasta-do-caso-A-item-id',                     -- p_folder_item_id
      'Casos/Cliente Pasta A',                        -- p_caminho_exibicao
      '90000000-0000-0000-0000-0000000000ad'::uuid    -- p_autor_id
    );
    ASSERT v_vinculo.cliente_id = '90000000-0000-0000-0000-000000000011',
      'vinculo deveria pertencer ao caso A';
    ASSERT v_vinculo.drive_id = 'drive-unico-1',
      'drive_id deveria vir da integracao (nao de parametro do chamador)';
    ASSERT v_vinculo.estado = 'ativo', 'vinculo novo deveria nascer ativo';
  END $$;
COMMIT;

-- ── 2. MESMO folder_item_id (mesma integracao/drive), JORNADA DIFERENTE (caso B) — 23505 ───
-- Prova o requisito de T057: "pasta já vinculada a outro caso → 409" (categoria HTTP; aqui, no
-- nível de banco, o ERRCODE que a Edge Function mapeia para 409).
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  DO $$
  BEGIN
    BEGIN
      PERFORM arquivos.vincular_pasta(
        '90000000-0000-0000-0000-000000000012'::uuid, -- p_cliente_id (caso B, DIFERENTE)
        '90000000-0000-0000-0000-000000000022'::uuid, -- p_jornada_id (caso B, DIFERENTE)
        '90000000-0000-0000-0000-000000000001'::uuid, -- MESMA integracao
        'pasta-do-caso-A-item-id',                     -- MESMO folder_item_id
        'Casos/Cliente Pasta B',
        '90000000-0000-0000-0000-0000000000ad'::uuid
      );
      ASSERT false, 'vincular o mesmo folder_item_id a outro caso deveria falhar (unique_violation)';
    EXCEPTION WHEN unique_violation THEN
      ASSERT SQLSTATE = '23505', 'ERRCODE deveria ser 23505 (unique_violation)';
    END;
  END $$;
ROLLBACK; -- a tentativa falhou de propósito; não deixa resíduo de transação pendurado.

-- ── 3. Controle negativo: folder_item_id DIFERENTE, mesma integração — nunca deveria colidir ─
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  DO $$
  DECLARE
    v_vinculo arquivos.vinculos_pasta;
  BEGIN
    SELECT * INTO v_vinculo FROM arquivos.vincular_pasta(
      '90000000-0000-0000-0000-000000000012'::uuid,
      '90000000-0000-0000-0000-000000000022'::uuid,
      '90000000-0000-0000-0000-000000000001'::uuid,
      'pasta-do-caso-B-item-id-DIFERENTE', -- folder_item_id distinto do caso A
      'Casos/Cliente Pasta B',
      '90000000-0000-0000-0000-0000000000ad'::uuid
    );
    ASSERT v_vinculo.cliente_id = '90000000-0000-0000-0000-000000000012',
      'pasta com folder_item_id distinto deveria vincular normalmente ao caso B';
  END $$;
COMMIT;

-- ── 4. Guarda SECURITY DEFINER: chamador que não é service_role é recusado (42501) ─────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"90000000-0000-0000-0000-0000000000ad","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    BEGIN
      PERFORM arquivos.vincular_pasta(
        '90000000-0000-0000-0000-000000000011'::uuid,
        '90000000-0000-0000-0000-000000000021'::uuid,
        '90000000-0000-0000-0000-000000000001'::uuid,
        'outra-pasta-qualquer',
        NULL,
        '90000000-0000-0000-0000-0000000000ad'::uuid
      );
      ASSERT false, 'chamador autenticado (não service_role) deveria ser recusado pela guarda';
    EXCEPTION WHEN OTHERS THEN
      ASSERT SQLSTATE = '42501', 'ERRCODE deveria ser 42501 (insufficient_privilege)';
    END;
  END $$;
ROLLBACK;

DO $$
BEGIN
  RAISE NOTICE 'arquivos.vincular_pasta e vinculos_pasta_folder_unico_idx: todas as asserções passaram';
END $$;
