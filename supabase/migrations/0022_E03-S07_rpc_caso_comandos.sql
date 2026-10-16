-- Description: Primeira Edge Function de comando transacional da E03-S07 (`caso-comandos`,
--              T031/T032) exige banco de dados com transacao unica por comando — supabase-js
--              chamado de dentro de uma Edge Function nao abre transacao entre dois `.insert()`
--              separados (design-tecnico.md Sec2, "Correcao em 2026-10-15"). As tres funcoes
--              abaixo seguem o MESMO precedente de `crm.criar_cliente_a_partir_de_lead` (0013) e
--              `comunicacao.registrar_entrada_canal` (0016): SECURITY DEFINER, guarda de papel
--              service_role primeiro, so DEPOIS `set_config('request.jwt.claims', ...)` com o
--              autor real, para que `audit.registrar_mudanca()` (trigger generico, 0008) capture
--              `auth.uid()` correto em vez de NULL.
--
--              `jornada.instanciar_a_partir_de_programa` expande `programas.programas.
--              fases_template` (JSONB, formato de apps/web/src/features/programas/domain/
--              types.ts) em `jornada.fases`/`jornada.etapas` — mesma regra hoje so no frontend
--              mock (apps/web/src/features/jornada/application/instanciar-jornada.ts): fase de
--              `ordem = 0` nasce liberada, as demais bloqueadas; etapa nasce sempre pendente.
--
--              `crm.registrar_contrato` grava `crm.contratos`/`crm.contrato_condicoes` (0017):
--              alteracao de contrato NUNCA reescreve o registro anterior — cria linha nova com
--              `substitui_contrato_id` apontando para o contrato ativo anterior, que vira
--              `ativo = false` (FR-022/FR-023, contracts/operacoes.md: "altera cria registro
--              novo, sem reescrever cobranca ja conciliada").
--
--              `crm.preparar_caso` cria (ou atualiza) `jornada.jornadas` (0003/0019) a partir do
--              contrato e do programa do catalogo; na primeira preparacao instancia fases/etapas
--              via `jornada.instanciar_a_partir_de_programa` e fixa `fase_atual_id` na fase de
--              ordem minima; preparacoes seguintes NAO reinstanciam (evita duplicar fases/etapas).
-- Story: E03-S07
-- Created: 2026-10-15

-- Rollback: DROP FUNCTION IF EXISTS crm.preparar_caso(uuid, uuid, text, uuid);
--           DROP FUNCTION IF EXISTS crm.registrar_contrato(uuid, text, text, integer, text, text, jsonb, uuid);
--           DROP FUNCTION IF EXISTS jornada.instanciar_a_partir_de_programa(uuid, uuid);

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- jornada.instanciar_a_partir_de_programa — expande o template do programa em fases/etapas da
-- jornada. Chamada só por `crm.preparar_caso` (mesma transação, mesma sessão `service_role`) —
-- por isso não recebe `p_autor_id` nem chama `set_config`: o autor da transação já foi fixado
-- pelo chamador antes desta chamada, e esta função não grava nenhuma coluna de autoria própria
-- (autoria aqui é só o `auth.uid()` que o trigger genérico de auditoria já resolve do contexto).
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION jornada.instanciar_a_partir_de_programa(
  p_jornada_id uuid,
  p_programa_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jornada, programas, pg_temp
AS $$
DECLARE
  v_fases_template jsonb;
  v_fase            jsonb;
  v_etapa           jsonb;
  v_fase_id         uuid;
  v_ordem           int;
BEGIN
  -- Guarda SEMPRE primeiro — SECURITY DEFINER sem isto é elevação de privilégio (mesmo
  -- comentário de crm.criar_cliente_a_partir_de_lead/comunicacao.registrar_entrada_canal).
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'instanciacao de jornada negada' USING ERRCODE = '42501';
  END IF;

  SELECT fases_template INTO v_fases_template
  FROM programas.programas
  WHERE id = p_programa_id;

  IF v_fases_template IS NULL THEN
    RAISE EXCEPTION 'programa inexistente' USING ERRCODE = '22023';
  END IF;

  FOR v_fase IN SELECT * FROM jsonb_array_elements(v_fases_template)
  LOOP
    v_ordem := (v_fase ->> 'ordem')::int;

    INSERT INTO jornada.fases (jornada_id, ordem, titulo, descricao, status)
    VALUES (
      p_jornada_id,
      v_ordem,
      v_fase ->> 'titulo',
      v_fase ->> 'descricao',
      CASE WHEN v_ordem = 0 THEN 'liberada' ELSE 'bloqueada' END
    )
    RETURNING id INTO v_fase_id;

    FOR v_etapa IN SELECT * FROM jsonb_array_elements(COALESCE(v_fase -> 'etapas', '[]'::jsonb))
    LOOP
      INSERT INTO jornada.etapas (
        fase_id, titulo, descricao, status,
        prazo_medio_dias_uteis, documentos_requeridos, responsavel, responsavel_detalhe
      )
      VALUES (
        v_fase_id,
        v_etapa ->> 'titulo',
        v_etapa ->> 'descricao',
        'pendente',
        (v_etapa ->> 'prazoMedioDiasUteis')::int,
        CASE
          WHEN v_etapa ? 'documentosRequeridos'
            THEN (SELECT array_agg(valor) FROM jsonb_array_elements_text(v_etapa -> 'documentosRequeridos') AS valor)
          ELSE NULL
        END,
        v_etapa ->> 'responsavel',
        v_etapa ->> 'responsavelDetalhe'
      );
    END LOOP;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION jornada.instanciar_a_partir_de_programa(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION jornada.instanciar_a_partir_de_programa(uuid, uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- crm.registrar_contrato — FR-022/FR-023. Alteracao de contrato cria registro novo; nunca
-- reescreve o anterior (cobranca ja conciliada depende da linha antiga permanecer intacta).
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION crm.registrar_contrato(
  p_cliente_id uuid,
  p_programa_id text,
  p_programa_versao text,
  p_prazo_resposta_dias_uteis integer,
  p_prioridade text,
  p_observacao text,
  p_condicoes jsonb,
  p_autor_id uuid
)
RETURNS crm.contratos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, pg_temp
AS $$
DECLARE
  v_contrato            crm.contratos%ROWTYPE;
  v_contrato_anterior_id uuid;
  v_condicao            jsonb;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'registro de contrato negado' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  -- SÓ DEPOIS da guarda: injeta o autor real na sessão desta transação, para que
  -- audit.registrar_mudanca() capture auth.uid() correto em vez de NULL (FR-010). Mantém
  -- 'role: service_role' no claim (não só 'sub'): achado empírico contra Postgres real —
  -- sem isto, qualquer chamada subsequente a OUTRA função SECURITY DEFINER que repita a guarda
  -- (ex.: crm.preparar_caso chamando jornada.instanciar_a_partir_de_programa) veria
  -- auth.role() cair no fallback current_user (dono da função, não service_role) e falhar com
  -- 42501 — a guarda virou teatro por um motivo diferente do alertado no design-tecnico.md
  -- (lá o risco é inverter a ordem; aqui é apagar o claim de papel ao setar o de autor).
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  -- Trava a linha do contrato ativo (se houver) para a duração da transação: evita dois admins
  -- registrando alteração do mesmo cliente ao mesmo tempo e os dois virando "o" contrato ativo.
  SELECT id INTO v_contrato_anterior_id
  FROM crm.contratos
  WHERE cliente_id = p_cliente_id AND ativo = true
  FOR UPDATE;

  -- p_prazo_resposta_dias_uteis fora de 1–60 é recusado pelo próprio CHECK da tabela (0017) —
  -- a exceção de constraint propaga; a Edge Function já valida isso via Zod antes de chamar.
  INSERT INTO crm.contratos (
    cliente_id, programa_id, programa_versao, prazo_resposta_dias_uteis,
    prioridade, observacao, registrado_por, substitui_contrato_id
  ) VALUES (
    p_cliente_id, p_programa_id, p_programa_versao, p_prazo_resposta_dias_uteis,
    p_prioridade, p_observacao, p_autor_id, v_contrato_anterior_id
  )
  RETURNING * INTO v_contrato;

  IF v_contrato_anterior_id IS NOT NULL THEN
    UPDATE crm.contratos SET ativo = false WHERE id = v_contrato_anterior_id;
  END IF;

  FOR v_condicao IN SELECT * FROM jsonb_array_elements(COALESCE(p_condicoes, '[]'::jsonb))
  LOOP
    INSERT INTO crm.contrato_condicoes (contrato_id, descricao, tipo, valor, moeda, vencimento, ordem)
    VALUES (
      v_contrato.id,
      v_condicao ->> 'descricao',
      v_condicao ->> 'tipo',
      (v_condicao ->> 'valor')::numeric,
      v_condicao ->> 'moeda',
      (v_condicao ->> 'vencimento')::date,
      (v_condicao ->> 'ordem')::int
    );
  END LOOP;

  RETURN v_contrato;
END;
$$;

REVOKE ALL ON FUNCTION crm.registrar_contrato(uuid, text, text, integer, text, text, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.registrar_contrato(uuid, text, text, integer, text, text, jsonb, uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- crm.preparar_caso — cria (1ª vez) ou atualiza (demais vezes) jornada.jornadas a partir do
-- contrato. Não reinstancia fases/etapas quando a jornada já existe (evita duplicar).
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION crm.preparar_caso(
  p_cliente_id uuid,
  p_contrato_id uuid,
  p_levantamento_estado text,
  p_autor_id uuid
)
RETURNS jornada.jornadas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, jornada, programas, pg_temp
AS $$
DECLARE
  v_contrato        crm.contratos%ROWTYPE;
  v_programa_id     uuid;
  v_jornada         jornada.jornadas%ROWTYPE;
  v_fase_minima_id  uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'preparacao de caso negada' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  -- Mantém 'role: service_role' no claim — ver comentário equivalente em crm.registrar_contrato.
  -- Aqui é obrigatório, não só defensivo: esta função chama
  -- jornada.instanciar_a_partir_de_programa (abaixo), que repete a mesma guarda.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  SELECT * INTO v_contrato
  FROM crm.contratos
  WHERE id = p_contrato_id AND cliente_id = p_cliente_id AND ativo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'contrato inexistente ou nao pertence ao cliente' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_programa_id
  FROM programas.programas
  WHERE codigo = v_contrato.programa_id AND versao = v_contrato.programa_versao;

  IF v_programa_id IS NULL THEN
    RAISE EXCEPTION 'programa do contrato nao encontrado no catalogo' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_jornada FROM jornada.jornadas WHERE cliente_id = p_cliente_id;

  IF NOT FOUND THEN
    INSERT INTO jornada.jornadas (
      cliente_id, contrato_id, programa_id, programa_versao,
      levantamento_estado, conferido_por, conferido_em, origem_situacao_inicial
    ) VALUES (
      p_cliente_id, p_contrato_id, v_contrato.programa_id, v_contrato.programa_versao,
      COALESCE(p_levantamento_estado, 'incompleto'), p_autor_id, now(), 'nascido_na_plataforma'
    )
    RETURNING * INTO v_jornada;

    PERFORM jornada.instanciar_a_partir_de_programa(v_jornada.id, v_programa_id);

    SELECT id INTO v_fase_minima_id
    FROM jornada.fases
    WHERE jornada_id = v_jornada.id
    ORDER BY ordem ASC
    LIMIT 1;

    UPDATE jornada.jornadas
    SET fase_atual_id = v_fase_minima_id, updated_at = now()
    WHERE id = v_jornada.id
    RETURNING * INTO v_jornada;
  ELSE
    -- Jornada já existe: nunca reinstancia fases/etapas (duplicaria). Só atualiza o vínculo com
    -- o contrato e o estado de levantamento, se informado.
    UPDATE jornada.jornadas
    SET
      contrato_id = p_contrato_id,
      levantamento_estado = COALESCE(p_levantamento_estado, levantamento_estado),
      conferido_por = p_autor_id,
      conferido_em = now(),
      updated_at = now()
    WHERE id = v_jornada.id
    RETURNING * INTO v_jornada;
  END IF;

  RETURN v_jornada;
END;
$$;

REVOKE ALL ON FUNCTION crm.preparar_caso(uuid, uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.preparar_caso(uuid, uuid, text, uuid) TO service_role;
