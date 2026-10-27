-- Casos existentes não podem ter papéis ou requisitos alterados pelo catálogo.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO programas.programas (id,codigo,nome,categoria,sujeito,versao,fases_template,documentos_exigidos,papeis)
VALUES ('a9000000-0000-4000-8000-000000000001','congelado','Programa','imigrante','individuo','1','[]','[]','[{"papel":"aplicante","obrigatorio":true}]');
INSERT INTO crm.clientes (id,nome,email,telefone,tipo_visto,case_manager) VALUES
 ('a9000000-0000-4000-8000-000000000002','Caso','caso@example.test','123','eb2','Bruno');
INSERT INTO crm.contratos (id,cliente_id,programa_id,programa_versao,prazo_resposta_dias_uteis,registrado_por)
VALUES ('a9000000-0000-4000-8000-000000000003','a9000000-0000-4000-8000-000000000002','congelado','1',10,'a9000000-0000-4000-8000-000000000004');
DO $$ BEGIN
  BEGIN
    UPDATE programas.programas SET papeis='[{"papel":"beneficiario","obrigatorio":true}]' WHERE id='a9000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'programa em uso foi alterado';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
  END;
  ASSERT (SELECT papeis -> 0 ->> 'papel' FROM programas.programas WHERE id='a9000000-0000-4000-8000-000000000001') = 'aplicante', 'papéis existentes mudaram';
  UPDATE programas.programas SET ativo=false WHERE id='a9000000-0000-4000-8000-000000000001';
  ASSERT NOT (SELECT ativo FROM programas.programas WHERE id='a9000000-0000-4000-8000-000000000001'), 'desativação operacional deveria ser permitida';
END $$;
INSERT INTO programas.programas (id,codigo,nome,categoria,sujeito,versao,fases_template,documentos_exigidos,papeis)
VALUES ('a9000000-0000-4000-8000-000000000005','nova','Programa novo','imigrante','individuo','1','[]','[]','[]');
UPDATE programas.programas SET papeis='[{"papel":"aplicante","obrigatorio":true}]' WHERE id='a9000000-0000-4000-8000-000000000005';
INSERT INTO crm.clientes (id,nome,email,telefone,tipo_visto,case_manager) VALUES
 ('a9000000-0000-4000-8000-000000000006','Caso novo','novo@example.test','123','eb2','Bruno');
INSERT INTO jornada.jornadas (cliente_id,programa_id,programa_versao) VALUES
 ('a9000000-0000-4000-8000-000000000006','nova','1');
DO $$ BEGIN
  BEGIN
    UPDATE programas.programas SET documentos_exigidos='[{"id":"novo"}]' WHERE id='a9000000-0000-4000-8000-000000000005';
    RAISE EXCEPTION 'programa em jornada foi alterado';
  EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
  END;
  ASSERT (SELECT documentos_exigidos FROM programas.programas WHERE id='a9000000-0000-4000-8000-000000000005') = '[]'::jsonb, 'requisitos da jornada mudaram';
END $$;
ROLLBACK;
