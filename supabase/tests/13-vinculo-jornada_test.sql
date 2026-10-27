-- A pasta deve pertencer ao mesmo cliente da jornada escolhida.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO crm.clientes (id, nome, email, telefone, tipo_visto, case_manager) VALUES
  ('c9000000-0000-4000-8000-000000000001', 'Caso A', 'a@example.test', '123', 'eb2', 'Bruno'),
  ('c9000000-0000-4000-8000-000000000002', 'Caso B', 'b@example.test', '123', 'eb2', 'Bruno');
INSERT INTO jornada.jornadas (id, cliente_id) VALUES
  ('c9000000-0000-4000-8000-000000000003', 'c9000000-0000-4000-8000-000000000001'),
  ('c9000000-0000-4000-8000-000000000004', 'c9000000-0000-4000-8000-000000000002');
INSERT INTO arquivos.integracoes_microsoft (id, conta_email, drive_id, pasta_raiz_item_id, escopos, estado, conectado_por)
VALUES ('c9000000-0000-4000-8000-000000000005', 'drive@example.test', 'drive', 'raiz', ARRAY['Files.ReadWrite'], 'conectada', 'c9000000-0000-4000-8000-000000000006');
SET LOCAL ROLE service_role;
SET LOCAL request.jwt.claims = '{"role":"service_role"}';
DO $$
BEGIN
  BEGIN
    PERFORM arquivos.vincular_pasta('c9000000-0000-4000-8000-000000000001',
      'c9000000-0000-4000-8000-000000000004', 'c9000000-0000-4000-8000-000000000005',
      'pasta-incorreta', NULL, 'c9000000-0000-4000-8000-000000000006');
    RAISE EXCEPTION 'vínculo com jornada de outro caso foi aceito';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  ASSERT NOT EXISTS (SELECT 1 FROM arquivos.vinculos_pasta WHERE folder_item_id = 'pasta-incorreta'),
    'vínculo recusado não pode ser gravado';
  PERFORM arquivos.vincular_pasta('c9000000-0000-4000-8000-000000000001',
    'c9000000-0000-4000-8000-000000000003', 'c9000000-0000-4000-8000-000000000005',
    'pasta-correta', NULL, 'c9000000-0000-4000-8000-000000000006');
  ASSERT EXISTS (SELECT 1 FROM arquivos.vinculos_pasta WHERE folder_item_id = 'pasta-correta'),
    'vínculo correto deve ser aceito';
END $$;
ROLLBACK;
