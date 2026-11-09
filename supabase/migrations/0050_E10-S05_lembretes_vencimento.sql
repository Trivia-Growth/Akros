-- Description: E10-S05 (parcial, por decisão do usuário em 2026-11-06 — depende de E10-S03,
--              que não existe: sem link de pagamento real, só a detecção/registro do lembrete).
--              `pagamentos.gerar_lembretes_vencimento()` roda 1x/dia via pg_cron (mesmo mecanismo
--              de `arquivos-processar`, 0028): para cada pagamento pendente/atrasado vencendo
--              hoje ou em 3 dias, registra UM evento em `comunicacao.eventos` (canal 'sistema'),
--              nunca duplicando no mesmo dia para o mesmo pagamento.
--
--              SPEC_DEVIATION (registrada aqui e em docs/SECURITY_DEBT.md): a spec do Bruno pede
--              envio real por WhatsApp (número do suporte) e e-mail institucional (adm@/suporte@)
--              com link de pagamento. Nada disso existe nesta entrega — não há mecanismo de
--              ENVIO proativo de WhatsApp no repositório (só resposta dentro de webhook) nem
--              provedor de e-mail configurado, e o link de pagamento depende de E10-S03
--              (QuickBooks/Global Pays), que não foi implementada nesta sessão (API não
--              confirmada). O que esta migration entrega é a DETECÇÃO automática e o REGISTRO do
--              lembrete na timeline do caso — a equipe vê o alerta e avisa o cliente manualmente
--              até o envio real existir.
-- Story: E10-S05
-- Created: 2026-11-06

-- Rollback:
--   SELECT cron.unschedule('pagamentos-lembretes-vencimento');
--   DROP FUNCTION IF EXISTS pagamentos.gerar_lembretes_vencimento();

CREATE OR REPLACE FUNCTION pagamentos.gerar_lembretes_vencimento()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pagamentos, comunicacao, pg_temp
AS $$
DECLARE
  v_pagamento record;
  v_gerados integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'geração de lembretes negada' USING ERRCODE = '42501';
  END IF;

  FOR v_pagamento IN
    SELECT p.id, p.cliente_id, p.descricao, p.valor, p.moeda, p.vencimento
    FROM pagamentos.pagamentos p
    WHERE p.status IN ('pendente', 'atrasado')
      AND p.vencimento IN (CURRENT_DATE, CURRENT_DATE + 3)
      AND NOT EXISTS (
        SELECT 1 FROM comunicacao.eventos e
        WHERE e.cliente_id = p.cliente_id
          AND e.canal = 'sistema'
          AND e.origem_id = 'lembrete-vencimento:' || p.id::text
          AND e.ocorrido_em::date = CURRENT_DATE
      )
  LOOP
    INSERT INTO comunicacao.eventos (
      cliente_id, canal, direcao, autor, conteudo, ocorrido_em, origem_id
    ) VALUES (
      v_pagamento.cliente_id,
      'sistema',
      'interno',
      'Sistema',
      format(
        'Lembrete automático: pagamento "%s" (%s %s) vence em %s.',
        v_pagamento.descricao, v_pagamento.moeda, v_pagamento.valor, v_pagamento.vencimento
      ),
      now(),
      'lembrete-vencimento:' || v_pagamento.id::text
    );
    v_gerados := v_gerados + 1;
  END LOOP;

  RETURN v_gerados;
END;
$$;

REVOKE ALL ON FUNCTION pagamentos.gerar_lembretes_vencimento() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pagamentos.gerar_lembretes_vencimento() TO service_role;

-- Agenda diária (mesmo padrão tolerante de `arquivos-processar`, 0028) — tentativa de habilitar
-- a extensão nunca aborta a migration em ambiente sem `shared_preload_libraries` (CI/local).
DO $$
BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
      EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'pg_cron indisponível neste ambiente (esperado — mesma ressalva de 0028): %', SQLERRM;
  END;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'pagamentos-lembretes-vencimento',
      '0 9 * * *',
      $cron$SELECT pagamentos.gerar_lembretes_vencimento();$cron$
    );
  END IF;
END $$;
