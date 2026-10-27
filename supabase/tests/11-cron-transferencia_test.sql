-- Manutenção da fila de transferência ao OneDrive (E03-S07, Fase 5/US2, migration 0028, T076).
-- Roda no job `db-tests`. Verifica lease e bloqueio da limpeza SQL direta --
-- `pg_cron` não roda neste ambiente (ver SPEC_DEVIATION no topo de 0028), então não há tick real
-- para esperar. A limpeza real pela API do Storage é testada no processador com serviços simulados.

\set ON_ERROR_STOP on

-- ── Semente: um caso, uma integração conectada, um vínculo de pasta ativo ──────────────────────
INSERT INTO crm.clientes (id, nome, email, telefone, tipo_visto, case_manager)
VALUES ('b0000000-0000-0000-0000-000000000001', 'Cliente Teste Cron', 'cron@example.com',
        '11900000005', 'eb2-niw', 'Natalia');

INSERT INTO arquivos.integracoes_microsoft (id, conta_email, drive_id, pasta_raiz_item_id, escopos, estado, conectado_por)
VALUES ('b0000000-0000-0000-0000-000000000002', 'akros@empresa.com', 'drive-cron-1', 'pasta-raiz-cron-1',
        ARRAY['Files.ReadWrite', 'offline_access'], 'conectada', 'b0000000-0000-0000-0000-00000000000a');

INSERT INTO arquivos.vinculos_pasta (id, cliente_id, integracao_id, drive_id, folder_item_id, validado_por, validado_em)
VALUES ('b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002', 'drive-cron-1', 'pasta-caso-cron-1',
        'b0000000-0000-0000-0000-00000000000a', now());

INSERT INTO jornada.jornadas (id, cliente_id)
VALUES ('b0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001');

-- Documento 1 (para a versão "armazenada" do cenário 2) e documento 2 (para a versão
-- "recebida"/pendente do cenário 3).
INSERT INTO documentos.documentos (id, cliente_id, nome, tipo, status, restrito_ao_papel)
VALUES ('b0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
        'Documento Armazenado', 'generico', 'aprovado', false);

INSERT INTO documentos.documentos (id, cliente_id, nome, tipo, status, restrito_ao_papel)
VALUES ('b0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001',
        'Documento Pendente', 'generico', 'enviado', false);

-- Versão 1: já ARMAZENADA (item_id confirmado), com objeto_temporario ainda presente — alvo da
-- limpeza (cenário 2).
INSERT INTO arquivos.versoes (id, cliente_id, documento_id, numero_versao, nome_original, mime,
  tamanho_bytes, objeto_temporario, drive_id, item_id, estado_recebimento, estado_armazenamento, enviado_por)
VALUES ('b0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000005', 1, 'requisito-armazenado.pdf', 'application/pdf',
        1000, 'b0000000-0000-0000-0000-000000000001/v7.pdf', 'drive-cron-1', 'item-final-cron-1',
        'recebida', 'armazenado', 'b0000000-0000-0000-0000-00000000000a');

-- Versão 2: RECEBIDA, transferência ainda PENDENTE — NUNCA deve ser limpa (garantia central do
-- ADR-0019: arquivo recuperável durante falha da Microsoft).
INSERT INTO arquivos.versoes (id, cliente_id, documento_id, numero_versao, nome_original, mime,
  tamanho_bytes, objeto_temporario, estado_recebimento, estado_armazenamento, enviado_por)
VALUES ('b0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000006', 1, 'requisito-pendente.pdf', 'application/pdf',
        2000, 'b0000000-0000-0000-0000-000000000001/v8.pdf', 'recebida', 'pendente',
        'b0000000-0000-0000-0000-00000000000a');

INSERT INTO arquivos.trabalhos_transferencia (id, versao_id, estado)
VALUES ('b0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000008', 'pendente');

-- Trabalho 2 (ligado à versão 1, já concluído) — não participa dos cenários de lease, só existe
-- para a FK NOT NULL/UNIQUE de trabalhos_transferencia.versao_id não impedir a semente acima
-- de ter um trabalho concluído coerente com estado_armazenamento = 'armazenado'.
INSERT INTO arquivos.trabalhos_transferencia (id, versao_id, estado, item_id_resultado)
VALUES ('b0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000007', 'concluido',
        'item-final-cron-1');

-- Objetos correspondentes no bucket `envios` (shim de storage.objects) — representam os arquivos
-- físicos temporários ainda presentes.
INSERT INTO storage.objects (bucket_id, name)
VALUES ('envios', 'b0000000-0000-0000-0000-000000000001/v7.pdf'),
       ('envios', 'b0000000-0000-0000-0000-000000000001/v8.pdf');

-- ── Trabalho com LEASE EXPIRADA, em_execucao (cenário 1) — versão dedicada, para não colidir
--    com o UNIQUE(versao_id) do trabalho da versão 8 (que fica livre para o cenário 3) ─────────
INSERT INTO documentos.documentos (id, cliente_id, nome, tipo, status, restrito_ao_papel)
VALUES ('b0000000-0000-0000-0000-00000000000d', 'b0000000-0000-0000-0000-000000000001',
        'Documento Lease', 'generico', 'enviado', false);

INSERT INTO arquivos.versoes (id, cliente_id, documento_id, numero_versao, nome_original, mime,
  tamanho_bytes, objeto_temporario, estado_recebimento, estado_armazenamento, enviado_por)
VALUES ('b0000000-0000-0000-0000-00000000000e', 'b0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-00000000000d', 1, 'requisito-lease.pdf', 'application/pdf',
        3000, 'b0000000-0000-0000-0000-000000000001/ve.pdf', 'recebida', 'pendente',
        'b0000000-0000-0000-0000-00000000000a');

INSERT INTO arquivos.trabalhos_transferencia (id, versao_id, estado, lease_ate, lease_dono)
VALUES ('b0000000-0000-0000-0000-00000000000c', 'b0000000-0000-0000-0000-00000000000e',
        'em_execucao', now() - interval '10 minutes', 'processador-morto-1');

-- ── Cenário 1: lease expirada (estado='em_execucao', lease_ate no passado) volta a 'pendente'
--    depois de liberar_leases_expiradas() ──────────────────────────────────────────────────────
DO $$
DECLARE
  v_qtd integer;
  v_estado text;
  v_lease_ate timestamptz;
  v_lease_dono text;
BEGIN
  SELECT arquivos.liberar_leases_expiradas() INTO v_qtd;
  ASSERT v_qtd >= 1, 'liberar_leases_expiradas deveria liberar ao menos 1 lease expirada';

  SELECT estado, lease_ate, lease_dono INTO v_estado, v_lease_ate, v_lease_dono
  FROM arquivos.trabalhos_transferencia WHERE id = 'b0000000-0000-0000-0000-00000000000c';
  ASSERT v_estado = 'pendente', format('esperado estado=pendente após lease expirada, veio %L', v_estado);
  ASSERT v_lease_ate IS NULL, 'lease_ate deveria ser NULL após liberar_leases_expiradas()';
  ASSERT v_lease_dono IS NULL, 'lease_dono deveria ser NULL após liberar_leases_expiradas()';
END $$;

-- Trabalho com lease AINDA VÁLIDA (controle negativo) não deve ser tocado.
INSERT INTO documentos.documentos (id, cliente_id, nome, tipo, status, restrito_ao_papel)
VALUES ('b0000000-0000-0000-0000-00000000000f', 'b0000000-0000-0000-0000-000000000001',
        'Documento Lease Valida', 'generico', 'enviado', false);

INSERT INTO arquivos.versoes (id, cliente_id, documento_id, numero_versao, nome_original, mime,
  tamanho_bytes, estado_recebimento, estado_armazenamento, enviado_por)
VALUES ('b0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-00000000000f', 1, 'requisito-lease-valida.pdf', 'application/pdf',
        4000, 'recebida', 'pendente', 'b0000000-0000-0000-0000-00000000000a');

INSERT INTO arquivos.trabalhos_transferencia (id, versao_id, estado, lease_ate, lease_dono)
VALUES ('b0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000010',
        'em_execucao', now() + interval '5 minutes', 'processador-vivo-1');

DO $$
DECLARE
  v_estado_antes text;
BEGIN
  PERFORM arquivos.liberar_leases_expiradas();
  SELECT estado INTO v_estado_antes FROM arquivos.trabalhos_transferencia
    WHERE id = 'b0000000-0000-0000-0000-000000000011';
  ASSERT v_estado_antes = 'em_execucao',
    'trabalho com lease ainda válida NÃO deveria voltar a pendente';
END $$;

-- ── Cenário 2: limpeza SQL direta é bloqueada para não deixar objeto órfão ────────────────────
DO $$
DECLARE
  v_objeto_depois text;
  v_existe_no_bucket boolean;
BEGIN
  BEGIN
    PERFORM arquivos.limpar_temporarios_confirmados();
    RAISE EXCEPTION 'limpeza SQL direta não deveria ser permitida';
  EXCEPTION WHEN feature_not_supported THEN NULL;
  END;

  SELECT objeto_temporario INTO v_objeto_depois FROM arquivos.versoes
    WHERE id = 'b0000000-0000-0000-0000-000000000007';
  ASSERT v_objeto_depois IS NOT NULL,
    'referência deve permanecer até a remoção pela API do Storage';

  SELECT EXISTS (
    SELECT 1 FROM storage.objects WHERE bucket_id = 'envios' AND name = 'b0000000-0000-0000-0000-000000000001/v7.pdf'
  ) INTO v_existe_no_bucket;
  ASSERT v_existe_no_bucket,
    'metadados do objeto não podem ser removidos diretamente por SQL';
END $$;

-- ── Cenário 3: versão 'recebida' com trabalho 'pendente' NÃO é limpa pela mesma função ─────────
DO $$
DECLARE
  v_objeto_depois text;
  v_existe_no_bucket boolean;
BEGIN
  SELECT objeto_temporario INTO v_objeto_depois FROM arquivos.versoes
    WHERE id = 'b0000000-0000-0000-0000-000000000008';
  ASSERT v_objeto_depois IS NOT NULL,
    'objeto_temporario de versão recebida com trabalho pendente NUNCA deveria ser limpo (garantia ADR-0019)';

  SELECT EXISTS (
    SELECT 1 FROM storage.objects WHERE bucket_id = 'envios' AND name = 'b0000000-0000-0000-0000-000000000001/v8.pdf'
  ) INTO v_existe_no_bucket;
  ASSERT v_existe_no_bucket,
    'objeto físico de versão recebida/pendente deveria continuar em storage.objects';
END $$;

-- Rodar liberação de lease de novo não deve alterar trabalho ainda válido.
DO $$
BEGIN
  PERFORM arquivos.liberar_leases_expiradas();
END $$;

DO $$ BEGIN RAISE NOTICE 'Cron de transferência (lease/limpeza, 0028): todas as asserções passaram'; END $$;
