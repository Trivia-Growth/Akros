-- Caso importado e compatibilidade com chamada legada (E03-S07).
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO programas.programas (codigo, nome, categoria, sujeito, versao, fases_template, documentos_exigidos)
VALUES ('teste-origem', 'Teste origem', 'imigrante', 'individuo', '1', '[]', '[]');
INSERT INTO crm.clientes (id, nome, email, telefone, tipo_visto, case_manager)
VALUES
  ('b9000000-0000-4000-8000-000000000001', 'Importado', 'importado@example.test', '123', 'eb2', 'Bruno'),
  ('b9000000-0000-4000-8000-000000000002', 'Novo', 'novo@example.test', '123', 'eb2', 'Bruno');
INSERT INTO crm.contratos (id, cliente_id, programa_id, programa_versao, prazo_resposta_dias_uteis, registrado_por)
VALUES
  ('b9000000-0000-4000-8000-000000000003', 'b9000000-0000-4000-8000-000000000001', 'teste-origem', '1', 10, 'b9000000-0000-4000-8000-000000000005'),
  ('b9000000-0000-4000-8000-000000000004', 'b9000000-0000-4000-8000-000000000002', 'teste-origem', '1', 10, 'b9000000-0000-4000-8000-000000000005');
DO $$ BEGIN
  ASSERT NOT has_function_privilege('authenticated', 'crm.preparar_caso_com_origem(uuid,uuid,text,uuid,text)', 'EXECUTE'), 'authenticated não deve executar RPC';
END $$;
SET LOCAL ROLE service_role;
SET LOCAL request.jwt.claims = '{"role":"service_role"}';
DO $$
DECLARE
  v_jornada jornada.jornadas%ROWTYPE;
BEGIN
  SELECT * INTO v_jornada FROM crm.preparar_caso_com_origem(
    'b9000000-0000-4000-8000-000000000001', 'b9000000-0000-4000-8000-000000000003',
    'incompleto', 'b9000000-0000-4000-8000-000000000005', 'importado');
  ASSERT v_jornada.origem_situacao_inicial = 'importado', 'origem importada não registrada';
  ASSERT v_jornada.conferido_por = 'b9000000-0000-4000-8000-000000000005', 'autor não registrado';
  ASSERT v_jornada.conferido_em IS NOT NULL, 'data de conferência ausente';
  SELECT * INTO v_jornada FROM crm.preparar_caso(
    'b9000000-0000-4000-8000-000000000002', 'b9000000-0000-4000-8000-000000000004',
    'incompleto', 'b9000000-0000-4000-8000-000000000005');
  ASSERT v_jornada.origem_situacao_inicial = 'nascido_na_plataforma', 'chamada legada mudou';
  BEGIN
    PERFORM crm.preparar_caso_com_origem(
      'b9000000-0000-4000-8000-000000000001', 'b9000000-0000-4000-8000-000000000003',
      'incompleto', 'b9000000-0000-4000-8000-000000000005', 'inválido');
    RAISE EXCEPTION 'origem inválida aceita';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  ASSERT (SELECT origem_situacao_inicial FROM jornada.jornadas WHERE cliente_id = 'b9000000-0000-4000-8000-000000000001') = 'importado', 'origem alterada após erro';
END $$;
ROLLBACK;
