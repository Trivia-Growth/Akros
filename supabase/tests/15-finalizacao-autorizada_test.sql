-- Autor da reserva é obrigatório para finalizar.
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
 ('e9000000-0000-4000-8000-000000000011', 'e9000000-0000-4000-8000-000000000001', 'e9000000-0000-4000-8000-000000000008', 'Restrito sem papel', 'generico', 'pendente', true, NULL, false);
INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
 ('e9000000-0000-4000-8000-000000000013', 'admin@example.test', '{"role":"admin"}');
SET LOCAL ROLE service_role;
SET LOCAL request.jwt.claims = '{"role":"service_role"}';
DO $$
DECLARE v_id uuid; v_admin_id uuid;
BEGIN
  SELECT versao_id INTO v_id FROM arquivos.reservar_envio('e9000000-0000-4000-8000-000000000009', NULL, 'arquivo.pdf', 10, 'application/pdf', false, 'e9000000-0000-4000-8000-000000000004');
  BEGIN
    PERFORM arquivos.finalizar_envio(v_id, 1, 'e9000000-0000-4000-8000-000000000006');
    RAISE EXCEPTION 'outro usuário finalizou reserva alheia';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;
  ASSERT (SELECT estado_recebimento FROM arquivos.versoes WHERE id = v_id) = 'reservada', 'reserva alheia foi alterada';
  UPDATE crm.participantes SET estado = 'revogado' WHERE id = 'e9000000-0000-4000-8000-000000000003';
  BEGIN
    PERFORM arquivos.finalizar_envio(v_id, 1, 'e9000000-0000-4000-8000-000000000004');
    RAISE EXCEPTION 'usuário revogado finalizou reserva';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;
  UPDATE crm.participantes SET estado = 'ativo' WHERE id = 'e9000000-0000-4000-8000-000000000003';
  PERFORM arquivos.finalizar_envio(v_id, 1, 'e9000000-0000-4000-8000-000000000004');
  ASSERT (SELECT estado_recebimento FROM arquivos.versoes WHERE id = v_id) = 'recebida', 'autor ativo não conseguiu finalizar';
  UPDATE crm.participantes SET estado = 'revogado' WHERE id = 'e9000000-0000-4000-8000-000000000003';
  BEGIN
    PERFORM arquivos.autorizar_finalizacao(v_id, 'e9000000-0000-4000-8000-000000000004');
    RAISE EXCEPTION 'usuário revogado consultou resultado anterior';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;
  SELECT versao_id INTO v_admin_id FROM arquivos.reservar_envio('e9000000-0000-4000-8000-000000000009', NULL, 'admin.pdf', 10, 'application/pdf', true, 'e9000000-0000-4000-8000-000000000013');
  PERFORM arquivos.finalizar_envio(v_admin_id, 1, 'e9000000-0000-4000-8000-000000000013');
  ASSERT (SELECT estado_recebimento FROM arquivos.versoes WHERE id = v_admin_id) = 'recebida', 'admin não conseguiu finalizar';
END $$;
ROLLBACK;
