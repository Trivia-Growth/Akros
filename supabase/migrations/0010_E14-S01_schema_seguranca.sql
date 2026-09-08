-- Description: Schema seguranca + tabela de rate limit das Edge Functions. Fecha SD-01 (P0).
--              Edge Function nao tem memoria entre invocacoes: contador em variavel de modulo
--              conta por isolate, o que nao conta nada. O estado precisa ser externo e atomico.
-- Story: E14-S01
-- Created: 2026-08-31

-- Rollback: DROP TABLE IF EXISTS seguranca.rate_limit CASCADE;
--           DROP FUNCTION IF EXISTS seguranca.consumir_cota(text, integer, integer);
--           DROP SCHEMA IF EXISTS seguranca;

CREATE SCHEMA IF NOT EXISTS seguranca;

-- `chave` e sha256(ip + segredo + rota) -- ver design.md. IP e dado pessoal sob LGPD; guardar em
-- claro criaria obrigacao de retencao e export numa tabela que nao deveria carregar isso. O hash
-- serve para contar, nao para identificar.
CREATE TABLE seguranca.rate_limit (
  chave         text        NOT NULL,
  janela_inicio timestamptz NOT NULL,
  contador      integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (chave, janela_inicio)
);

-- Expurgo por janela vencida usa este indice; sem ele o DELETE do `consumir_cota` faz seq scan.
CREATE INDEX rate_limit_janela_idx ON seguranca.rate_limit (janela_inicio);

ALTER TABLE seguranca.rate_limit ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguranca.rate_limit FORCE ROW LEVEL SECURITY;

-- Nenhuma policy para `authenticated` ou `anon`, de proposito: saber quantas tentativas restam e
-- informacao para quem ataca. So `service_role` (as Edge Functions) toca esta tabela.
GRANT USAGE ON SCHEMA seguranca TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA seguranca TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA seguranca GRANT ALL ON TABLES TO service_role;

-- Sem trigger de auditoria: `audit.*` e trilha de negocio, e contador de rate limit e ruido
-- operacional de volume imprevisivel. Poluir a trilha auditavel com isso destroi o valor dela.

/**
 * Consome uma unidade de cota e devolve o estado da janela.
 *
 * Faz tudo num round-trip e de forma atomica -- SELECT seguido de UPDATE seria corrida, e corrida
 * num limitador significa que dois pedidos simultaneos passam pelo teto. O `ON CONFLICT DO UPDATE`
 * do Postgres resolve com bloqueio de linha.
 *
 * Devolve `permitido` e `restante` para a function decidir; ela nunca le a tabela direto.
 */
CREATE OR REPLACE FUNCTION seguranca.consumir_cota(
  p_chave           text,
  p_teto            integer,
  p_janela_segundos integer
)
RETURNS TABLE (permitido boolean, contador integer, reinicia_em timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = seguranca, pg_temp
AS $$
DECLARE
  v_inicio   timestamptz;
  v_contador integer;
BEGIN
  -- Janela fixa alinhada ao epoch: toda instancia calcula o mesmo inicio sem coordenacao.
  v_inicio := to_timestamp(floor(extract(epoch FROM now()) / p_janela_segundos) * p_janela_segundos);

  INSERT INTO seguranca.rate_limit AS rl (chave, janela_inicio, contador)
  VALUES (p_chave, v_inicio, 1)
  ON CONFLICT (chave, janela_inicio)
  DO UPDATE SET contador = rl.contador + 1
  RETURNING rl.contador INTO v_contador;

  -- Expurgo oportunista: linha de janela vencida e lixo. Sai junto do proprio UPSERT, sem cron
  -- novo para manter. O limite de 2 janelas atras da folga para depuracao.
  DELETE FROM seguranca.rate_limit
   WHERE janela_inicio < v_inicio - make_interval(secs => p_janela_segundos * 2);

  RETURN QUERY SELECT
    v_contador <= p_teto,
    v_contador,
    v_inicio + make_interval(secs => p_janela_segundos);
END;
$$;

REVOKE ALL ON FUNCTION seguranca.consumir_cota(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION seguranca.consumir_cota(text, integer, integer) TO service_role;
