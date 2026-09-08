-- Teste de `seguranca.consumir_cota` (E14-S01, AC-1/AC-2). Roda no job `db-tests` da CI, contra
-- um Postgres limpo com todas as migrations aplicadas.
--
-- Sem pgTAP de proposito: a extensao nao existe na imagem `postgres:17` e trocar a imagem por uma
-- do Supabase amarraria o job a uma tag especifica. `ASSERT` do plpgsql com ON_ERROR_STOP=1 no psql
-- da o mesmo resultado -- o job fica vermelho -- sem dependencia nova.

\set ON_ERROR_STOP on

DO $$
DECLARE
  r record;
  i integer;
BEGIN
  -- ── AC-1: conta ate o teto e nega a partir dele ───────────────────────────
  FOR i IN 1..3 LOOP
    SELECT * INTO r FROM seguranca.consumir_cota('chave-a', 3, 60);
    ASSERT r.permitido, format('requisicao %s deveria passar (teto 3), contador=%s', i, r.contador);
    ASSERT r.contador = i, format('contador esperado %s, veio %s', i, r.contador);
  END LOOP;

  SELECT * INTO r FROM seguranca.consumir_cota('chave-a', 3, 60);
  ASSERT NOT r.permitido, 'a 4a requisicao deveria ser negada com teto 3';
  ASSERT r.reinicia_em > now(), 'reinicia_em deve apontar para o futuro (vira Retry-After)';

  -- ── Chaves diferentes nao compartilham cota ───────────────────────────────
  -- Prova que a rota entra na chave: o teto de uma function nao consome o da outra.
  SELECT * INTO r FROM seguranca.consumir_cota('chave-b', 3, 60);
  ASSERT r.permitido AND r.contador = 1, 'chave nova deve comecar do zero';

  -- ── AC-2: o estado e compartilhado, nao por processo ──────────────────────
  -- A linha existe na tabela e e o que qualquer outra invocacao vai ler. E o ponto central do
  -- design: contador em variavel de modulo contaria por isolate.
  ASSERT (SELECT contador FROM seguranca.rate_limit WHERE chave = 'chave-a') = 4,
    'o contador precisa estar persistido, nao em memoria do processo';

  -- ── Janela nova zera a contagem ───────────────────────────────────────────
  -- Simula o tempo passando reescrevendo o inicio da janela para tras.
  UPDATE seguranca.rate_limit
     SET janela_inicio = janela_inicio - interval '10 minutes'
   WHERE chave = 'chave-a';

  SELECT * INTO r FROM seguranca.consumir_cota('chave-a', 3, 60);
  ASSERT r.permitido AND r.contador = 1, 'janela nova deve recomecar do 1';

  -- ── Expurgo oportunista remove janela vencida ─────────────────────────────
  ASSERT (SELECT count(*) FROM seguranca.rate_limit WHERE chave = 'chave-a') = 1,
    'a janela antiga de chave-a deveria ter sido expurgada pelo proprio consumir_cota';

  RAISE NOTICE 'seguranca.consumir_cota: todas as asserções passaram';
END
$$;

-- Nota sobre concorrencia real (AC-2): duas sessoes simultaneas nao sao simulaveis dentro de um
-- unico script psql. A atomicidade vem do `INSERT ... ON CONFLICT DO UPDATE`, que o Postgres
-- resolve com bloqueio de linha -- e o que este teste garante e que a implementacao usa esse
-- caminho, e nao um SELECT seguido de UPDATE (que passaria neste teste sequencial e falharia em
-- producao). Se alguem trocar a implementacao pelo caminho errado, as asserções de contador
-- continuam verdes: a defesa contra isso e a revisao do SQL, nao este arquivo. Registrado aqui
-- para nao virar falsa sensacao de cobertura.
