-- A-02: nem cliente nem admin escrevem documentos.documentos, pagamentos.pagamentos ou
-- jornada.etapas por UPDATE direto (E03-S07, 0018). Roda no job `db-tests`.
--
-- Isto so e possivel porque `00-shim-supabase.sql` faz `auth.jwt()` ler `request.jwt.claims` do
-- settings da sessao, igual ao PostgREST do Supabase. Com o stub devolvendo NULL, toda policy
-- daria falso e o teste "passaria" provando o oposto do que parece.
--
-- 0018 revoga o GRANT UPDATE de `authenticated` (cliente e admin, mesmo role) nas 3 tabelas —
-- entao o UPDATE ja falha com insufficient_privilege antes mesmo da RLS avaliar qualquer policy
-- (as policies de UPDATE tambem foram removidas em 0018; nao ha mais nenhuma pra avaliar).

\set ON_ERROR_STOP on

-- ── Semente: um cliente/caso, uma jornada com uma fase e uma etapa, um documento e um pagamento
--    do mesmo caso. Inserida como owner, antes de assumir papel de aplicacao (mesma convencao de
--    02-rls-leads/06-rls-participantes).

-- auth.users PRIMEIRO -- crm.clientes.auth_user_id tem FK real para auth.users(id) (0001), e o
-- shim de 00-shim-supabase.sql cria essa tabela vazia. Sem esta linha o INSERT de crm.clientes
-- abaixo quebra com foreign_key_violation (\set ON_ERROR_STOP on aborta o script inteiro antes
-- de qualquer prova rodar -- nao e so defensivo, e o que faz crm.meu_cliente_id() resolver o
-- cliente certo via auth_user_id = auth.uid(), em vez do UPDATE ser negado por motivo errado
-- (cliente_id = NULL nunca bate com nada, o que provaria vazio, nao que a RLS bloqueou).
INSERT INTO auth.users (id) VALUES ('e9111111-1111-1111-1111-111111111111');

INSERT INTO crm.clientes (id, auth_user_id, nome, email, telefone, tipo_visto, case_manager)
VALUES ('a9111111-1111-1111-1111-111111111111', 'e9111111-1111-1111-1111-111111111111',
        'Cliente Teste A-02', 'clientea02@example.com', '11900000001', 'eb2-niw', 'Natalia');

INSERT INTO jornada.jornadas (id, cliente_id)
VALUES ('b9111111-1111-1111-1111-111111111111', 'a9111111-1111-1111-1111-111111111111');

INSERT INTO jornada.fases (id, jornada_id, ordem, titulo, descricao, status)
VALUES ('c9111111-1111-1111-1111-111111111111', 'b9111111-1111-1111-1111-111111111111',
        1, 'Fase Teste', 'Descricao da fase teste', 'liberada');

INSERT INTO jornada.etapas (id, fase_id, titulo, descricao, status, responsavel)
VALUES ('d9111111-1111-1111-1111-111111111111', 'c9111111-1111-1111-1111-111111111111',
        'Etapa Teste', 'Descricao da etapa teste', 'pendente', 'cliente');

INSERT INTO documentos.documentos (id, cliente_id, nome, tipo, status)
VALUES ('e9111111-1111-1111-1111-111111111111', 'a9111111-1111-1111-1111-111111111111',
        'Documento Teste', 'passaporte', 'enviado');

INSERT INTO pagamentos.pagamentos (id, cliente_id, descricao, valor, moeda, status, vencimento, tipo)
VALUES ('f9111111-1111-1111-1111-111111111111', 'a9111111-1111-1111-1111-111111111111',
        'Pagamento Teste', 1000.00, 'USD', 'pendente', '2026-12-01', 'entrada');

-- ── 1. Cliente NAO aprova o proprio documento por UPDATE direto ─────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"e9111111-1111-1111-1111-111111111111","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    BEGIN
      UPDATE documentos.documentos SET status = 'aprovado'
      WHERE id = 'e9111111-1111-1111-1111-111111111111';
      ASSERT false, 'cliente NAO pode aprovar o proprio documento por UPDATE direto';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- esperado: 0018 revoga GRANT UPDATE de authenticated em documentos.documentos
    END;
  END $$;
COMMIT;

-- Releitura (fora do role restrito, como owner) — prova que a tentativa acima nao mudou nada.
-- Um UPDATE bloqueado sem releitura nao prova nada (convencao do projeto, ver 0005/E13-S01..S03).
DO $$
BEGIN
  ASSERT (SELECT status FROM documentos.documentos WHERE id = 'e9111111-1111-1111-1111-111111111111')
    = 'enviado', 'status do documento NAO deveria ter mudado';
END $$;

-- ── 2. Cliente NAO marca o proprio pagamento como pago, nem muda o valor ────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"e9111111-1111-1111-1111-111111111111","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    BEGIN
      UPDATE pagamentos.pagamentos SET status = 'pago', valor = 1.00
      WHERE id = 'f9111111-1111-1111-1111-111111111111';
      ASSERT false, 'cliente NAO pode marcar o proprio pagamento como pago nem mudar o valor';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- esperado: 0018 revoga GRANT UPDATE de authenticated em pagamentos.pagamentos
    END;
  END $$;
COMMIT;

DO $$
BEGIN
  ASSERT (SELECT status FROM pagamentos.pagamentos WHERE id = 'f9111111-1111-1111-1111-111111111111')
    = 'pendente', 'status do pagamento NAO deveria ter mudado';
  ASSERT (SELECT valor FROM pagamentos.pagamentos WHERE id = 'f9111111-1111-1111-1111-111111111111')
    = 1000.00, 'valor do pagamento NAO deveria ter mudado';
END $$;

-- ── 3. Cliente NAO conclui a propria etapa por UPDATE direto ────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"e9111111-1111-1111-1111-111111111111","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    BEGIN
      UPDATE jornada.etapas SET status = 'concluida'
      WHERE id = 'd9111111-1111-1111-1111-111111111111';
      ASSERT false, 'cliente NAO pode concluir a propria etapa por UPDATE direto';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- esperado: 0018 revoga GRANT UPDATE de authenticated em jornada.etapas
    END;
  END $$;
COMMIT;

DO $$
BEGIN
  ASSERT (SELECT status FROM jornada.etapas WHERE id = 'd9111111-1111-1111-1111-111111111111')
    = 'pendente', 'status da etapa NAO deveria ter mudado';
END $$;

-- ── 4. Admin TAMBEM nao escreve por UPDATE direto — mesmo GRANT revogado, sem
--      excecao de papel (0018 e intencional: admin volta a escrever so via Edge
--      Function de comando, pra auditoria/revisao otimista existirem sempre) ──
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    BEGIN
      UPDATE documentos.documentos SET status = 'aprovado'
      WHERE id = 'e9111111-1111-1111-1111-111111111111';
      ASSERT false, 'admin TAMBEM nao pode aprovar documento por UPDATE direto (0018 e intencional)';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- esperado
    END;
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    BEGIN
      UPDATE pagamentos.pagamentos SET status = 'pago', valor = 1.00
      WHERE id = 'f9111111-1111-1111-1111-111111111111';
      ASSERT false, 'admin TAMBEM nao pode marcar pagamento como pago por UPDATE direto (0018 e intencional)';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- esperado
    END;
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"99999999-9999-9999-9999-999999999999","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    BEGIN
      UPDATE jornada.etapas SET status = 'concluida'
      WHERE id = 'd9111111-1111-1111-1111-111111111111';
      ASSERT false, 'admin TAMBEM nao pode concluir etapa por UPDATE direto (0018 e intencional)';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL; -- esperado
    END;
  END $$;
COMMIT;

-- Releitura final — prova que nenhuma das tentativas de admin acima mudou nada.
DO $$
BEGIN
  ASSERT (SELECT status FROM documentos.documentos WHERE id = 'e9111111-1111-1111-1111-111111111111')
    = 'enviado', 'status do documento NAO deveria ter mudado (tentativa de admin)';
  ASSERT (SELECT status FROM pagamentos.pagamentos WHERE id = 'f9111111-1111-1111-1111-111111111111')
    = 'pendente', 'status do pagamento NAO deveria ter mudado (tentativa de admin)';
  ASSERT (SELECT valor FROM pagamentos.pagamentos WHERE id = 'f9111111-1111-1111-1111-111111111111')
    = 1000.00, 'valor do pagamento NAO deveria ter mudado (tentativa de admin)';
  ASSERT (SELECT status FROM jornada.etapas WHERE id = 'd9111111-1111-1111-1111-111111111111')
    = 'pendente', 'status da etapa NAO deveria ter mudado (tentativa de admin)';
END $$;

DO $$ BEGIN RAISE NOTICE 'A-02: nenhum papel escreve documentos/pagamentos/etapas por UPDATE direto — todas as asserções passaram'; END $$;
