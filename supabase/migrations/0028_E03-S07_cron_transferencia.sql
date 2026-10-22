-- Description: Fila do processador de transferência ao OneDrive (E03-S07, Fase 5/US2, ADR-0019,
--              T069-T071/T075). Três peças:
--              1) `arquivos.adquirir_trabalho_pendente(p_lease_dono, p_lease_minutos)` — RPC
--                 auxiliar que faz `SELECT ... FOR UPDATE SKIP LOCKED` + `UPDATE` em UMA chamada
--                 SQL (supabase-js não expõe `FOR UPDATE SKIP LOCKED` em `.from().select()`).
--                 `SECURITY DEFINER` simples: guarda só `auth.role() <> 'service_role'`, sem
--                 passo de `set_config` de autor — não há autor humano aqui, é o processador do
--                 sistema (design-tecnico.md §2, "Auditoria").
--              2) Agendamento de `arquivo-processar` a cada minuto via `pg_cron`.
--              3) `arquivos.liberar_leases_expiradas()` e
--                 `arquivos.limpar_temporarios_confirmados()` (T075/T076).
--
--              SPEC_DEVIATION (ambiente, mesmo padrão de tolerância já usado para
--              `supabase_vault` em 0016): `pg_cron` exige `shared_preload_libraries` configurado
--              no SERVIDOR Postgres, não só `CREATE EXTENSION`. Este Postgres local (compartilhado
--              entre sessões/testes) NÃO tem isso habilitado — `CREATE EXTENSION pg_cron` falha
--              aqui com "pg_cron must be loaded via shared_preload_libraries". Não alteramos a
--              configuração do servidor compartilhado para contornar isso (afetaria outras
--              sessões). Em vez disso, a tentativa de habilitar a extensão e de agendar o job
--              fica dentro de um bloco `DO $$ ... EXCEPTION WHEN OTHERS THEN RAISE WARNING ...
--              END $$` que NUNCA aborta a migration — as duas funções auxiliares (3, acima)
--              existem independente de `pg_cron` estar disponível, e são o que
--              `11-cron-transferencia_test.sql` prova de verdade (chamando-as diretamente, sem
--              esperar um tick real do `pg_cron`, que não roda neste ambiente). Em produção
--              (Supabase hospedado), `pg_cron` já vem habilitado — o agendamento roda
--              normalmente quando esta migration aplicar lá; a chamada HTTP do cron autentica com
--              `current_setting('app.settings.service_role_key', true)` (padrão documentado da
--              própria Supabase para pg_cron→Edge Function), configurado por T133 (fase 10,
--              rollout, @devops) junto do cadastro do segredo `processador:arquivos`/client
--              secret Microsoft no Vault — até lá, o job roda com Bearer vazio,
--              `arquivo-processar` responde 401 e nada processa (sem efeito colateral, sem
--              erro que derrube o schedule).
-- Story: E03-S07
-- Created: 2026-10-21

-- Rollback:
--   SELECT cron.unschedule('arquivo-processar-a-cada-minuto'); -- se existir
--   DROP FUNCTION IF EXISTS arquivos.limpar_temporarios_confirmados();
--   DROP FUNCTION IF EXISTS arquivos.liberar_leases_expiradas();
--   DROP FUNCTION IF EXISTS arquivos.adquirir_trabalho_pendente(text, integer);

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- RPC auxiliar: adquire trabalho pendente por lease (T069 passo 1).
-- ─────────────────────────────────────────────────────────────────────────────────────────────
CREATE FUNCTION arquivos.adquirir_trabalho_pendente(p_lease_dono text, p_lease_minutos integer)
RETURNS TABLE (id uuid, versao_id uuid, tentativas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = arquivos, pg_temp
AS $$
BEGIN
  -- Guarda SEMPRE primeiro (mesmo critério de design-tecnico.md §2, passo 1 do padrão RPC) —
  -- SECURITY DEFINER sem isto é elevação de privilégio. Sem passo de autor: `service_role` aqui é
  -- o processador do sistema, nunca um usuário final a auditar.
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'aquisição de trabalho de transferência negada' USING ERRCODE = '42501';
  END IF;
  IF p_lease_dono IS NULL OR length(p_lease_dono) = 0 THEN
    RAISE EXCEPTION 'lease_dono obrigatório' USING ERRCODE = '22023';
  END IF;
  IF p_lease_minutos IS NULL OR p_lease_minutos <= 0 THEN
    RAISE EXCEPTION 'lease_minutos inválido' USING ERRCODE = '22023';
  END IF;

  -- `UPDATE ... FROM (SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1) ... RETURNING` é uma única
  -- instrução SQL: o Postgres resolve o SELECT FOR UPDATE SKIP LOCKED e o UPDATE como uma
  -- operação atômica — duas chamadas concorrentes para o MESMO trabalho `pendente` nunca
  -- adquirem a mesma linha; a perdedora recebe zero linhas (SKIP LOCKED), nunca erro. Prova
  -- empírica contra Postgres real com duas sessões `psql` reais no relatório desta task.
  RETURN QUERY
  UPDATE arquivos.trabalhos_transferencia t
  SET estado = 'em_execucao',
      lease_ate = now() + make_interval(mins => p_lease_minutos),
      lease_dono = p_lease_dono,
      updated_at = now()
  FROM (
    SELECT tt.id
    FROM arquivos.trabalhos_transferencia tt
    WHERE tt.estado = 'pendente'
      AND tt.proxima_tentativa_em <= now()
    ORDER BY tt.proxima_tentativa_em
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  ) alvo
  WHERE t.id = alvo.id
  RETURNING t.id, t.versao_id, t.tentativas;
END;
$$;

REVOKE ALL ON FUNCTION arquivos.adquirir_trabalho_pendente(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION arquivos.adquirir_trabalho_pendente(text, integer) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- Manutenção da fila (T075/T076) — chamadas diretamente pelo cron (ou manualmente, no teste).
-- Não expostas à API: nenhum GRANT a `authenticated`; não são SECURITY DEFINER (o chamador, seja
-- `pg_cron` seja a sessão do teste, já roda com privilégio suficiente nas tabelas/schema
-- `storage` tocados — ver GRANTs de 0020).
-- ─────────────────────────────────────────────────────────────────────────────────────────────

-- Lease expirada (processador morreu/timeout no meio) volta a `pendente` para a PRÓXIMA execução
-- pegar de novo — nunca fica presa em `em_execucao` para sempre.
CREATE FUNCTION arquivos.liberar_leases_expiradas()
RETURNS integer
LANGUAGE sql
SET search_path = arquivos, pg_temp
AS $$
  WITH liberadas AS (
    UPDATE arquivos.trabalhos_transferencia
    SET estado = 'pendente', lease_ate = NULL, lease_dono = NULL, updated_at = now()
    WHERE estado = 'em_execucao' AND lease_ate < now()
    RETURNING 1
  )
  SELECT count(*)::integer FROM liberadas;
$$;

REVOKE ALL ON FUNCTION arquivos.liberar_leases_expiradas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION arquivos.liberar_leases_expiradas() TO service_role;

-- Remove o objeto temporário do bucket `envios` SÓ de versão já confirmada no destino final
-- (`estado_armazenamento = 'armazenado'` E `item_id IS NOT NULL`) — nunca de versão `recebida`
-- com transferência ainda `pendente`/`em_execucao`: apagar o temporário antes da confirmação
-- quebraria a garantia central do ADR-0019 (arquivo recuperável durante falha da Microsoft). A
-- condição dupla (estado_armazenamento + item_id) já é suficiente para essa garantia — nenhuma
-- versão alcança `armazenado` sem `item_id` confirmado (T071, mesma invariante de
-- `arquivo-processar.ts`/`marcarConcluido`).
CREATE FUNCTION arquivos.limpar_temporarios_confirmados()
RETURNS integer
LANGUAGE plpgsql
SET search_path = arquivos, storage, pg_temp
AS $$
DECLARE
  v_qtd integer;
BEGIN
  WITH alvo AS (
    SELECT v.id, v.objeto_temporario
    FROM arquivos.versoes v
    WHERE v.estado_armazenamento = 'armazenado'
      AND v.item_id IS NOT NULL
      AND v.objeto_temporario IS NOT NULL
  ),
  removidos AS (
    DELETE FROM storage.objects o
    USING alvo
    WHERE o.bucket_id = 'envios' AND o.name = alvo.objeto_temporario
    RETURNING alvo.id
  )
  UPDATE arquivos.versoes v
  SET objeto_temporario = NULL
  FROM removidos r
  WHERE v.id = r.id;
  GET DIAGNOSTICS v_qtd = ROW_COUNT;
  RETURN v_qtd;
END;
$$;

REVOKE ALL ON FUNCTION arquivos.limpar_temporarios_confirmados() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION arquivos.limpar_temporarios_confirmados() TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- Agendamento via pg_cron (T075) — tolerante a ambiente sem `shared_preload_libraries` (ver
-- SPEC_DEVIATION no topo deste arquivo). Nunca aborta a migration.
-- ─────────────────────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
      EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_cron';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'pg_cron indisponível neste ambiente (esperado — ver SPEC_DEVIATION no topo de 0028): %', SQLERRM;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
       AND EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
      -- Chama `arquivo-processar` autenticado pela chave privilegiada do projeto (é isto que
      -- `requireServiceRole`/`_shared/auth.ts` valida — comparação em tempo constante contra
      -- `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEYS`, não um escopo próprio de Vault).
      -- `current_setting('app.settings.service_role_key', true)` é o padrão documentado da
      -- própria Supabase para pg_cron→Edge Function (configurado uma vez por
      -- `ALTER DATABASE ... SET app.settings.service_role_key = '...'`, fora desta migration —
      -- T133/@devops, fase 10 de rollout). Antes desse cadastro, a chamada carrega um Bearer
      -- vazio, `arquivo-processar` responde 401 e o job simplesmente não processa nada (sem
      -- efeito colateral, sem erro que derrube o schedule).
      PERFORM cron.schedule(
        'arquivo-processar-a-cada-minuto',
        '* * * * *',
        $cron$
        SELECT net.http_post(
          url := coalesce(current_setting('app.settings.supabase_functions_url', true), '') || '/arquivo-processar',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.service_role_key', true), ''),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        );
        $cron$
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'cron.schedule indisponível/falhou neste ambiente (esperado — ver SPEC_DEVIATION no topo de 0028): %', SQLERRM;
  END;
END $$;
