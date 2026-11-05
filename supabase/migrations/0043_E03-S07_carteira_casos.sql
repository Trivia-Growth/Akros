-- Description: `crm.carteira_casos` (E03-S07, Fase 8/US5, design-tecnico.md §1.7) — leitura
--              agregada de todos os casos, paginada por cursor, para a visão geral admin
--              (CarteiraRealPage). `LANGUAGE sql STABLE`, SEM `SECURITY DEFINER`: a RLS de quem
--              chama decide quais linhas de `crm.clientes`/`documentos.documentos`/
--              `pagamentos.pagamentos`/`jornada.*` entram — mesmo critério do design-tecnico.md
--              §1.7 ("sem SECURITY DEFINER: a RLS de quem chama decide o que elas veem").
--
--              Regras replicadas de `crm/domain/caso.ts` (`calcularProximaAcao`), agora em SQL:
--              sem contrato ativo OU levantamento incompleto → responsável 'akros' (cadastro
--              incompleto nunca "parece" em dia, FR-013); documento faltante/pagamento vencido →
--              'cliente'; documento em revisão/pagamento em conferência → 'akros'; nada pendente →
--              NULL (não "não sabemos"). `total_por_criterio` é agregado sobre TODO o conjunto
--              filtrado (CTE `filtrados`), não só a página — design-tecnico.md §1.7 "totais por
--              critério são completos, não da página". Pendência de terceiro fica sempre 0: sem
--              fonte real no banco ainda, mesmo critério de `SituacaoCaso.pendenciasTerceiro` no
--              frontend (Clientes360RealPage.tsx).
--
--              Cursor por `(updated_at, cliente_id)` descendente (design-tecnico.md §1.7) via
--              comparação de tupla — página seguinte pede os dois valores da última linha da
--              página atual. `p_limite` sempre travado em 50 (LEAST), nunca confiado ao chamador.
-- Story: E03-S07
-- Created: 2026-11-05

-- Rollback:
--   DROP FUNCTION IF EXISTS crm.carteira_casos(
--     text, text, text, text, text, date, timestamptz, uuid, integer);

CREATE OR REPLACE FUNCTION crm.carteira_casos(
  p_busca text DEFAULT NULL,
  p_programa text DEFAULT NULL,
  p_fase text DEFAULT NULL,
  p_responsavel text DEFAULT NULL,
  p_tipo_pendencia text DEFAULT NULL,
  p_prazo_ate date DEFAULT NULL,
  p_cursor_atualizado_em timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_limite integer DEFAULT 50
)
RETURNS TABLE (
  cliente_id uuid,
  cliente_nome text,
  programa_id text,
  fase_atual_titulo text,
  responsavel text,
  documentos_faltantes integer,
  documentos_em_revisao integer,
  documentos_em_ajustes integer,
  pagamentos_vencidos integer,
  pagamentos_em_conferencia integer,
  situacao_financeira text,
  levantamento_estado text,
  prazo_mais_proximo date,
  atualizado_em timestamptz,
  total_por_criterio jsonb
)
LANGUAGE sql
STABLE
SET search_path = crm, jornada, documentos, pagamentos, pg_temp
AS $$
WITH casos AS (
  SELECT
    c.id AS cliente_id,
    c.nome AS cliente_nome,
    c.updated_at,
    c.programa_id,
    (ct.id IS NOT NULL) AS tem_contrato,
    j.levantamento_estado,
    fa.titulo AS fase_atual_titulo,
    COALESCE((
      SELECT count(*) FROM documentos.documentos d
      WHERE d.cliente_id = c.id AND d.status IN ('pendente', 'ajustes')
    ), 0)::integer AS documentos_faltantes,
    COALESCE((
      SELECT count(*) FROM documentos.documentos d
      WHERE d.cliente_id = c.id AND d.status = 'em_analise'
    ), 0)::integer AS documentos_em_revisao,
    COALESCE((
      SELECT count(*) FROM documentos.documentos d
      WHERE d.cliente_id = c.id AND d.status = 'ajustes'
    ), 0)::integer AS documentos_em_ajustes,
    COALESCE((
      SELECT count(*) FROM pagamentos.pagamentos p
      WHERE p.cliente_id = c.id AND p.status = 'atrasado'
    ), 0)::integer AS pagamentos_vencidos,
    COALESCE((
      SELECT count(*) FROM pagamentos.pagamentos p
      WHERE p.cliente_id = c.id AND p.status = 'em_conferencia'
    ), 0)::integer AS pagamentos_em_conferencia,
    EXISTS(
      SELECT 1 FROM pagamentos.pagamentos p
      WHERE p.cliente_id = c.id AND p.status = 'atrasado'
    ) AS tem_pagamento_atrasado,
    (
      SELECT min(p.vencimento) FROM pagamentos.pagamentos p
      WHERE p.cliente_id = c.id AND p.status IN ('pendente', 'atrasado')
    ) AS prazo_mais_proximo
  FROM crm.clientes c
  LEFT JOIN crm.contratos ct ON ct.cliente_id = c.id AND ct.ativo = true
  LEFT JOIN jornada.jornadas j ON j.cliente_id = c.id
  LEFT JOIN jornada.fases fa ON fa.id = j.fase_atual_id
  WHERE c.deleted_at IS NULL
),
derivados AS (
  SELECT
    casos.*,
    CASE
      WHEN NOT tem_contrato THEN 'akros'
      WHEN levantamento_estado IS DISTINCT FROM 'conferido' THEN 'akros'
      WHEN documentos_faltantes > 0 OR pagamentos_vencidos > 0 THEN 'cliente'
      WHEN documentos_em_revisao > 0 OR pagamentos_em_conferencia > 0 THEN 'akros'
      ELSE NULL
    END AS responsavel_calc,
    CASE WHEN tem_pagamento_atrasado THEN 'atrasado' ELSE 'em_dia' END AS situacao_financeira_calc,
    CASE
      WHEN documentos_faltantes + documentos_em_revisao + documentos_em_ajustes > 0 THEN 'documento'
      WHEN pagamentos_vencidos + pagamentos_em_conferencia > 0 THEN 'pagamento'
      ELSE NULL
    END AS tipo_pendencia_calc
  FROM casos
),
filtrados AS (
  SELECT *
  FROM derivados
  WHERE (p_busca IS NULL OR cliente_nome ILIKE '%' || p_busca || '%')
    AND (p_programa IS NULL OR programa_id = p_programa)
    AND (p_fase IS NULL OR fase_atual_titulo = p_fase)
    AND (p_responsavel IS NULL OR responsavel_calc = p_responsavel)
    AND (p_tipo_pendencia IS NULL OR tipo_pendencia_calc = p_tipo_pendencia)
    AND (p_prazo_ate IS NULL OR prazo_mais_proximo <= p_prazo_ate)
),
totais AS (
  SELECT jsonb_build_object(
    'total', count(*),
    'aguardandoCliente', count(*) FILTER (WHERE responsavel_calc = 'cliente'),
    'aguardandoAkros', count(*) FILTER (WHERE responsavel_calc = 'akros'),
    'financeiroAtrasado', count(*) FILTER (WHERE situacao_financeira_calc = 'atrasado'),
    'cadastroIncompleto',
      count(*) FILTER (WHERE NOT tem_contrato OR levantamento_estado IS DISTINCT FROM 'conferido')
  ) AS valor
  FROM filtrados
)
SELECT
  f.cliente_id,
  f.cliente_nome,
  f.programa_id,
  f.fase_atual_titulo,
  f.responsavel_calc,
  f.documentos_faltantes,
  f.documentos_em_revisao,
  f.documentos_em_ajustes,
  f.pagamentos_vencidos,
  f.pagamentos_em_conferencia,
  f.situacao_financeira_calc,
  COALESCE(f.levantamento_estado, 'incompleto'),
  f.prazo_mais_proximo,
  f.updated_at,
  (SELECT valor FROM totais)
FROM filtrados f
WHERE p_cursor_atualizado_em IS NULL
   OR (f.updated_at, f.cliente_id) < (p_cursor_atualizado_em, p_cursor_id)
ORDER BY f.updated_at DESC, f.cliente_id DESC
LIMIT LEAST(COALESCE(p_limite, 50), 50);
$$;

REVOKE ALL ON FUNCTION crm.carteira_casos(
  text, text, text, text, text, date, timestamptz, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.carteira_casos(
  text, text, text, text, text, date, timestamptz, uuid, integer) TO authenticated;
