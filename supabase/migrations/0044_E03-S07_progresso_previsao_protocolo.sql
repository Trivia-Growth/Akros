-- Description: `jornada.progresso_caso` e `jornada.previsao_protocolo` (E03-S07, Fase 9/US7,
--              design-tecnico.md §1.7). `LANGUAGE sql STABLE`, sem `SECURITY DEFINER`: a RLS de
--              quem chama decide o que as subconsultas enxergam, mesmo critério de
--              `crm.carteira_casos` (0043). `p_cliente_id` é opcional — `NULL` resolve para
--              `crm.meu_cliente_id()` (uso do portal, sem o cliente poder pedir o caso alheio);
--              um admin pode passar o id explícito (uso futuro no Cliente 360 admin).
--
--              `progresso_caso`: cadastro incompleto (`levantamento_estado <> 'conferido'`) nunca
--              "parece" em dia — percentual `NULL` e `criterio = 'cadastro_incompleto'` (FR-013,
--              mesma regra de `SituacaoCaso`/`calcularProximaAcao` em `crm/domain/caso.ts`).
--              Critério de percentual: documentos se houver algum solicitado, senão etapas; sem
--              nenhum dos dois, `NULL`/`'sem_dado'` — ausência de dado nunca vira zero.
--
--              `previsao_protocolo`: NUNCA estima decisão do USCIS — só a data em que a Akros
--              teria reunido e aprovado todos os requisitos (protocolo), a partir do ritmo
--              histórico de aprovações do próprio caso. Menos de 3 aprovações →
--              `motivo_sem_previsao = 'historico_insuficiente'`, `data_estimada` NULL (histórico
--              insuficiente para extrapolar). Sem contrato ativo → `'sem_contrato'` (não há
--              `prazo_resposta_dias_uteis` para somar). Fórmula aberta (mesmo espírito do fator de
--              ritmo de E09-S02): `dias = requisitos_restantes * (ritmo_dias_por_requisito +
--              prazo_resposta_dias_uteis)` — soma o tempo histórico do cliente entregar com o
--              tempo contratual da Akros analisar, por requisito ainda não aprovado. Chute
--              razoável, não validado com dado real — mesmo critério documentado em
--              `calcular-previsao.ts` (E09-S02).
-- Story: E03-S07
-- Created: 2026-11-05

-- Rollback:
--   DROP FUNCTION IF EXISTS jornada.previsao_protocolo(uuid);
--   DROP FUNCTION IF EXISTS jornada.progresso_caso(uuid);

CREATE OR REPLACE FUNCTION jornada.progresso_caso(p_cliente_id uuid DEFAULT NULL)
RETURNS TABLE (
  percentual numeric,
  requisitos_total integer,
  requisitos_concluidos integer,
  etapas_total integer,
  etapas_concluidas integer,
  criterio text,
  calculado_em timestamptz
)
LANGUAGE sql
STABLE
SET search_path = jornada, documentos, crm, pg_temp
AS $$
WITH alvo AS (
  SELECT COALESCE(p_cliente_id, crm.meu_cliente_id()) AS cliente_id
),
jorn AS (
  SELECT j.levantamento_estado
  FROM jornada.jornadas j, alvo
  WHERE j.cliente_id = alvo.cliente_id
),
docs AS (
  SELECT
    count(*) AS total,
    count(*) FILTER (WHERE d.status = 'aprovado') AS concluidos
  FROM documentos.documentos d, alvo
  WHERE d.cliente_id = alvo.cliente_id
),
etapas AS (
  SELECT
    count(*) AS total,
    count(*) FILTER (WHERE e.status = 'concluida') AS concluidas
  FROM jornada.etapas e
  JOIN jornada.fases f ON f.id = e.fase_id
  JOIN jornada.jornadas j2 ON j2.id = f.jornada_id, alvo
  WHERE j2.cliente_id = alvo.cliente_id
)
SELECT
  CASE
    WHEN (SELECT levantamento_estado FROM jorn) IS DISTINCT FROM 'conferido' THEN NULL
    WHEN (SELECT total FROM docs) > 0
      THEN round((SELECT concluidos FROM docs)::numeric / (SELECT total FROM docs) * 100, 0)
    WHEN (SELECT total FROM etapas) > 0
      THEN round((SELECT concluidas FROM etapas)::numeric / (SELECT total FROM etapas) * 100, 0)
    ELSE NULL
  END,
  COALESCE((SELECT total FROM docs), 0)::integer,
  COALESCE((SELECT concluidos FROM docs), 0)::integer,
  COALESCE((SELECT total FROM etapas), 0)::integer,
  COALESCE((SELECT concluidas FROM etapas), 0)::integer,
  CASE
    WHEN (SELECT levantamento_estado FROM jorn) IS DISTINCT FROM 'conferido' THEN 'cadastro_incompleto'
    WHEN (SELECT total FROM docs) > 0 THEN 'documentos'
    WHEN (SELECT total FROM etapas) > 0 THEN 'etapas'
    ELSE 'sem_dado'
  END,
  now();
$$;

REVOKE ALL ON FUNCTION jornada.progresso_caso(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION jornada.progresso_caso(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION jornada.previsao_protocolo(p_cliente_id uuid DEFAULT NULL)
RETURNS TABLE (
  data_estimada date,
  motivo_sem_previsao text,
  entregas_consideradas integer,
  ritmo_dias_por_requisito numeric,
  calculado_em timestamptz
)
LANGUAGE sql
STABLE
SET search_path = jornada, documentos, crm, pg_temp
AS $$
WITH alvo AS (
  SELECT COALESCE(p_cliente_id, crm.meu_cliente_id()) AS cliente_id
),
aprovacoes AS (
  SELECT dr.decidido_em
  FROM documentos.decisoes_revisao dr
  JOIN documentos.documentos d ON d.id = dr.documento_id, alvo
  WHERE d.cliente_id = alvo.cliente_id AND dr.decisao = 'aprovado'
),
intervalos AS (
  SELECT
    EXTRACT(EPOCH FROM (decidido_em - lag(decidido_em) OVER (ORDER BY decidido_em))) / 86400 AS dias
  FROM aprovacoes
),
ritmo AS (
  SELECT
    (SELECT count(*) FROM aprovacoes) AS entregas,
    (SELECT avg(dias) FROM intervalos WHERE dias IS NOT NULL) AS media_dias
),
restantes AS (
  SELECT count(*) AS qtde
  FROM documentos.documentos d, alvo
  WHERE d.cliente_id = alvo.cliente_id AND d.status <> 'aprovado'
),
contrato AS (
  SELECT ct.prazo_resposta_dias_uteis
  FROM crm.contratos ct, alvo
  WHERE ct.cliente_id = alvo.cliente_id AND ct.ativo = true
  LIMIT 1
)
SELECT
  CASE
    WHEN (SELECT entregas FROM ritmo) < 3 THEN NULL
    WHEN (SELECT prazo_resposta_dias_uteis FROM contrato) IS NULL THEN NULL
    ELSE (
      now()::date + (
        (SELECT qtde FROM restantes)
        * (COALESCE((SELECT media_dias FROM ritmo), 0) + (SELECT prazo_resposta_dias_uteis FROM contrato))
      )::integer
    )
  END,
  CASE
    WHEN (SELECT entregas FROM ritmo) < 3 THEN 'historico_insuficiente'
    WHEN (SELECT prazo_resposta_dias_uteis FROM contrato) IS NULL THEN 'sem_contrato'
    ELSE NULL
  END,
  COALESCE((SELECT entregas FROM ritmo), 0)::integer,
  (SELECT media_dias FROM ritmo),
  now();
$$;

REVOKE ALL ON FUNCTION jornada.previsao_protocolo(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION jornada.previsao_protocolo(uuid) TO authenticated;
