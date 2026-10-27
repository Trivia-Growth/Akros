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
SET LOCAL ROLE service_role;
SET LOCAL request.jwt.claims = '{"role":"service_role"}';
DO $$
BEGIN
  PERFORM * FROM arquivos.reservar_envio('e9000000-0000-4000-8000-000000000009', NULL, 'arquivo.pdf', 10, 'application/pdf', false, 'e9000000-0000-4000-8000-000000000004');
  BEGIN
    PERFORM * FROM arquivos.reservar_envio('e9000000-0000-4000-8000-000000000009', NULL, 'arquivo.pdf', 10, 'application/pdf', false, 'e9000000-0000-4000-8000-000000000006');
    RAISE EXCEPTION 'outro caso pôde enviar';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;
  BEGIN
    PERFORM * FROM arquivos.reservar_envio('e9000000-0000-4000-8000-000000000010', NULL, 'arquivo.pdf', 10, 'application/pdf', false, 'e9000000-0000-4000-8000-000000000004');
    RAISE EXCEPTION 'papel errado pôde enviar';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;
  BEGIN
    PERFORM * FROM arquivos.reservar_envio('e9000000-0000-4000-8000-000000000011', NULL, 'arquivo.pdf', 10, 'application/pdf', false, 'e9000000-0000-4000-8000-000000000004');
    RAISE EXCEPTION 'restrito sem papel pôde enviar';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;
  BEGIN
    PERFORM * FROM arquivos.reservar_envio('e9000000-0000-4000-8000-000000000012', NULL, 'arquivo.pdf', 10, 'application/pdf', false, 'e9000000-0000-4000-8000-000000000004');
    RAISE EXCEPTION 'papel errado enviou a requisito restrito e conjunto';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;
END $$;
ROLLBACK;
