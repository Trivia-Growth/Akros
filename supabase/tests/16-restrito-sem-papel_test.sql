-- Requisito restrito sem papel válido não pode ser exposto.
-- Requisito comum pode ser enviado por participante do caso; restrições permanecem.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO crm.clientes (id, nome, email, telefone, tipo_visto, case_manager) VALUES
 ('e9000000-0000-4000-8000-000000000001', 'Caso A', 'a@example.test', '123', 'eb2', 'Bruno'),
 ('e9000000-0000-4000-8000-000000000002', 'Caso B', 'b@example.test', '123', 'eb2', 'Bruno');
INSERT INTO crm.participantes (id, cliente_id, papel, sujeito_tipo, auth_user_id, nome_exibicao, email) VALUES
 ('e9000000-0000-4000-8000-000000000003', 'e9000000-0000-4000-8000-000000000001', 'aplicante', 'titular', 'e9000000-0000-4000-8000-000000000004', 'A', 'a@example.test'),
 ('e9000000-0000-4000-8000-000000000005', 'e9000000-0000-4000-8000-000000000002', 'aplicante', 'titular', 'e9000000-0000-4000-8000-000000000006', 'B', 'b@example.test');
INSERT INTO jornada.jornadas (id, cliente_id) VALUES ('e9000000-0000-4000-8000-000000000007', 'e9000000-0000-4000-8000-000000000001');
INSERT INTO jornada.fases (id, jornada_id, ordem, titulo, descricao, status) VALUES
 ('e9000000-0000-4000-8000-000000000008', 'e9000000-0000-4000-8000-000000000007', 1, 'Fase', 'Fase', 'liberada');
INSERT INTO documentos.documentos (id, cliente_id, fase_id, nome, tipo, status, restrito_ao_papel, papel_dirigido, envio_conjunto) VALUES
 ('e9000000-0000-4000-8000-000000000009', 'e9000000-0000-4000-8000-000000000001', 'e9000000-0000-4000-8000-000000000008', 'Comum', 'generico', 'pendente', false, NULL, false),
 ('e9000000-0000-4000-8000-000000000010', 'e9000000-0000-4000-8000-000000000001', 'e9000000-0000-4000-8000-000000000008', 'Dirigido', 'generico', 'pendente', true, 'beneficiario', false),
 ('e9000000-0000-4000-8000-000000000011', 'e9000000-0000-4000-8000-000000000001', 'e9000000-0000-4000-8000-000000000008', 'Restrito sem papel', 'generico', 'pendente', true, NULL, false),
 ('e9000000-0000-4000-8000-000000000012', 'e9000000-0000-4000-8000-000000000001', 'e9000000-0000-4000-8000-000000000008', 'Restrito conjunto', 'generico', 'pendente', true, 'beneficiario', true);
INSERT INTO arquivos.versoes (id, cliente_id, documento_id, numero_versao, nome_original, mime, tamanho_bytes, estado_recebimento, enviado_por)
VALUES ('e9000000-0000-4000-8000-000000000014', 'e9000000-0000-4000-8000-000000000001', 'e9000000-0000-4000-8000-000000000011', 1, 'restrito.pdf', 'application/pdf', 10, 'recebida', 'e9000000-0000-4000-8000-000000000004');
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000004","app_metadata":{"role":"cliente"}}';
DO $$ BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM documentos.documentos WHERE id = 'e9000000-0000-4000-8000-000000000011'), 'documento restrito sem papel ficou visível';
  ASSERT NOT EXISTS (SELECT 1 FROM arquivos.versoes WHERE id = 'e9000000-0000-4000-8000-000000000014'), 'versão restrita sem papel ficou visível';
  ASSERT EXISTS (SELECT 1 FROM documentos.documentos WHERE id = 'e9000000-0000-4000-8000-000000000009'), 'documento comum deveria estar visível';
END $$;
SET LOCAL request.jwt.claims = '{"sub":"e9000000-0000-4000-8000-000000000013","app_metadata":{"role":"admin"}}';
DO $$ BEGIN
  ASSERT EXISTS (SELECT 1 FROM documentos.documentos WHERE id = 'e9000000-0000-4000-8000-000000000011'), 'equipe precisa identificar e corrigir requisito inválido';
END $$;
ROLLBACK;
