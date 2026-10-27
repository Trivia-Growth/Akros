-- Familiares devem pertencer ao mesmo caso do documento ou participante.
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
UPDATE crm.clientes SET perfil_imigratorio = '{"familiares":[{"id":"familia-a","nome":"Ana"}]}'::jsonb WHERE id = 'e9000000-0000-4000-8000-000000000001';
UPDATE crm.clientes SET perfil_imigratorio = '{"familiares":[{"id":"familia-b","nome":"Bia"}]}'::jsonb WHERE id = 'e9000000-0000-4000-8000-000000000002';
SET LOCAL ROLE service_role;
SET LOCAL request.jwt.claims = '{"role":"service_role"}';
DO $$ BEGIN
  BEGIN
    INSERT INTO documentos.documentos (id,cliente_id,fase_id,nome,tipo,status,sujeito_tipo,sujeito_familiar_id) VALUES
      ('e9000000-0000-4000-8000-000000000015','e9000000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000008','Familiar errado','generico','pendente','familiar','familia-b');
    RAISE EXCEPTION 'documento aceitou familiar de outro caso';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  INSERT INTO documentos.documentos (id,cliente_id,fase_id,nome,tipo,status,sujeito_tipo,sujeito_familiar_id) VALUES
    ('e9000000-0000-4000-8000-000000000016','e9000000-0000-4000-8000-000000000001','e9000000-0000-4000-8000-000000000008','Familiar correto','generico','pendente','familiar','familia-a');
  BEGIN
    INSERT INTO crm.participantes (cliente_id,papel,sujeito_tipo,familiar_id,nome_exibicao) VALUES
      ('e9000000-0000-4000-8000-000000000001','familiar_apoio','familiar','familia-b','Bia');
    RAISE EXCEPTION 'participante aceitou familiar de outro caso';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  INSERT INTO crm.participantes (cliente_id,papel,sujeito_tipo,familiar_id,nome_exibicao) VALUES
    ('e9000000-0000-4000-8000-000000000001','familiar_apoio','familiar','familia-a','Ana');
END $$;
ROLLBACK;
