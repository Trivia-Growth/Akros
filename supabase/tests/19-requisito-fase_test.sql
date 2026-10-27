-- Solicitação deve usar requisito ativo da fase do programa congelado.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO programas.programas (codigo,nome,categoria,sujeito,versao,fases_template,documentos_exigidos)
VALUES ('programa-teste-fase','Programa teste','imigrante','individuo','1',
  '[{"id":"fase-a","ordem":0,"titulo":"A"},{"id":"fase-b","ordem":1,"titulo":"B"}]',
  '[{"id":"requisito-a","faseTemplateId":"fase-a","tipo":"generico","titulo":"A"},{"id":"inativo","faseTemplateId":"fase-a","tipo":"generico","titulo":"Inativo","ativo":false}]');
INSERT INTO crm.clientes (id,nome,email,telefone,tipo_visto,case_manager) VALUES
 ('f9000000-0000-4000-8000-000000000001','Caso','caso@example.test','123','eb2','Bruno');
INSERT INTO jornada.jornadas (id,cliente_id,programa_id,programa_versao) VALUES
 ('f9000000-0000-4000-8000-000000000002','f9000000-0000-4000-8000-000000000001','programa-teste-fase','1');
INSERT INTO jornada.fases (id,jornada_id,ordem,titulo,descricao,status) VALUES
 ('f9000000-0000-4000-8000-000000000003','f9000000-0000-4000-8000-000000000002',0,'A','','liberada'),
 ('f9000000-0000-4000-8000-000000000004','f9000000-0000-4000-8000-000000000002',1,'B','','bloqueada');
SET LOCAL ROLE service_role;
SET LOCAL request.jwt.claims = '{"role":"service_role"}';
DO $$ BEGIN
  BEGIN
    PERFORM crm.solicitar_documento('f9000000-0000-4000-8000-000000000001','f9000000-0000-4000-8000-000000000004','requisito-a','caso',NULL,NULL,'Documento',NULL,NULL,'f9000000-0000-4000-8000-000000000005');
    RAISE EXCEPTION 'requisito de outra fase foi aceito';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM crm.solicitar_documento('f9000000-0000-4000-8000-000000000001','f9000000-0000-4000-8000-000000000003','inativo','caso',NULL,NULL,'Documento',NULL,NULL,'f9000000-0000-4000-8000-000000000005');
    RAISE EXCEPTION 'requisito inativo foi aceito';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  PERFORM crm.solicitar_documento('f9000000-0000-4000-8000-000000000001','f9000000-0000-4000-8000-000000000003','requisito-a','caso',NULL,NULL,'Documento',NULL,NULL,'f9000000-0000-4000-8000-000000000005');
  ASSERT (SELECT count(*) FROM documentos.documentos WHERE cliente_id='f9000000-0000-4000-8000-000000000001') = 1, 'somente solicitação válida deve existir';
END $$;
ROLLBACK;
