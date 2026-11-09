-- Description: Fundação de E07-S05 (IA de apoio ao processo) — `documentos.pre_analises`
--              (US1, nunca envolve rede externa), `documentos.rascunhos_resposta` (US3,
--              admin-only), `documentos.chamadas_ia` (auditoria append-only das chamadas a
--              OpenRouter — nunca guarda o conteúdo enviado, só metadado), coluna
--              `crm.clientes.ia_apoio_ativa` (FR-010, default true) e a RPC
--              `crm.definir_ia_apoio` que a altera (mesmo template SECURITY DEFINER de
--              0022/0042/0045 — guarda service_role primeiro, só depois set_config com o autor
--              real). RLS de `pre_analises` espelha o predicado de `documentos.documentos`
--              (participante vê a pré-análise do próprio documento, por papel); `rascunhos_resposta`
--              e `chamadas_ia` são admin-only (dado de trabalho da equipe, nunca do cliente).
-- Story: E07-S05
-- Created: 2026-11-06

-- Rollback:
--   DROP FUNCTION IF EXISTS crm.definir_ia_apoio(uuid, boolean, uuid);
--   ALTER TABLE crm.clientes DROP COLUMN IF EXISTS ia_apoio_ativa;
--   DROP TABLE IF EXISTS documentos.chamadas_ia;
--   DROP TABLE IF EXISTS documentos.rascunhos_resposta;
--   DROP TABLE IF EXISTS documentos.pre_analises;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- documentos.pre_analises (US1)
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE documentos.pre_analises (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id              uuid NOT NULL UNIQUE,
  pagina_completa        boolean NOT NULL,
  resolucao_suficiente   boolean NOT NULL,
  tipo_conteudo          text NOT NULL CHECK (tipo_conteudo IN ('texto_pesquisavel', 'imagem_escaneada')),
  motivo_problema        text,
  calculado_em           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pre_analise_motivo_quando_problema CHECK (
    (pagina_completa AND resolucao_suficiente AND motivo_problema IS NULL)
    OR (NOT (pagina_completa AND resolucao_suficiente) AND motivo_problema IS NOT NULL)
  )
);

ALTER TABLE documentos.pre_analises
  ADD CONSTRAINT pre_analises_versao_fk FOREIGN KEY (versao_id)
    REFERENCES arquivos.versoes(id) NOT VALID;

ALTER TABLE documentos.pre_analises ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos.pre_analises FORCE ROW LEVEL SECURITY;
GRANT SELECT ON documentos.pre_analises TO authenticated;
GRANT ALL ON documentos.pre_analises TO service_role;

CREATE POLICY "admin_ve_todas_pre_analises" ON documentos.pre_analises
  FOR SELECT USING (crm.e_admin());

CREATE POLICY "participante_ve_pre_analise_do_seu_documento" ON documentos.pre_analises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM arquivos.versoes v
      JOIN documentos.documentos d ON d.id = v.documento_id
      WHERE v.id = pre_analises.versao_id
        AND d.cliente_id IN (SELECT crm.meus_casos())
        AND (
          d.restrito_ao_papel = false
          OR d.papel_dirigido IS NULL
          OR crm.tenho_papel(d.cliente_id, d.papel_dirigido)
        )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- documentos.rascunhos_resposta (US3) — admin-only, nunca visível ao cliente
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE documentos.rascunhos_resposta (
  id                                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id                       uuid NOT NULL,
  texto                              text NOT NULL,
  prazo_resposta_dias_uteis_usado    integer NOT NULL,
  prioridade_usada                   text NOT NULL CHECK (prioridade_usada IN ('padrao', 'prioritaria')),
  gerado_em                          timestamptz NOT NULL DEFAULT now(),
  editado_por                        uuid,
  editado_em                         timestamptz
);

ALTER TABLE documentos.rascunhos_resposta
  ADD CONSTRAINT rascunhos_resposta_documento_fk FOREIGN KEY (documento_id)
    REFERENCES documentos.documentos(id) NOT VALID;

ALTER TABLE documentos.rascunhos_resposta ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos.rascunhos_resposta FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON documentos.rascunhos_resposta TO authenticated;
GRANT ALL ON documentos.rascunhos_resposta TO service_role;

CREATE POLICY "admin_ve_rascunhos_resposta" ON documentos.rascunhos_resposta
  FOR SELECT USING (crm.e_admin());
CREATE POLICY "admin_edita_rascunhos_resposta" ON documentos.rascunhos_resposta
  FOR UPDATE USING (crm.e_admin());
-- INSERT só via service_role (job de geração) — sem policy de INSERT para authenticated.

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- documentos.chamadas_ia — auditoria append-only, nunca guarda o conteúdo enviado
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE documentos.chamadas_ia (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id              uuid NOT NULL,
  provedor               text NOT NULL,
  finalidade             text NOT NULL CHECK (finalidade IN ('cruzamento_requisito', 'rascunho_resposta')),
  enviado_em             timestamptz NOT NULL DEFAULT now(),
  enviado_por_processo   text NOT NULL
);

ALTER TABLE documentos.chamadas_ia
  ADD CONSTRAINT chamadas_ia_versao_fk FOREIGN KEY (versao_id)
    REFERENCES arquivos.versoes(id) NOT VALID;

ALTER TABLE documentos.chamadas_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos.chamadas_ia FORCE ROW LEVEL SECURITY;
-- Append-only por GRANT (nunca UPDATE/DELETE a ninguém, mesmo critério de audit.eventos/0008):
-- service_role tem BYPASSRLS, FORCE não o alcança, então a garantia real é a ausência do GRANT.
GRANT SELECT, INSERT ON documentos.chamadas_ia TO authenticated;
GRANT ALL ON documentos.chamadas_ia TO service_role;

CREATE POLICY "admin_ve_chamadas_ia" ON documentos.chamadas_ia
  FOR SELECT USING (crm.e_admin());
-- INSERT só via service_role dentro do job — sem policy de INSERT para authenticated.

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- crm.clientes.ia_apoio_ativa (FR-010)
-- ─────────────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE crm.clientes ADD COLUMN ia_apoio_ativa boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION crm.definir_ia_apoio(
  p_cliente_id uuid,
  p_ativa boolean,
  p_autor_id uuid
)
RETURNS crm.clientes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, pg_temp
AS $$
DECLARE
  v_cliente crm.clientes%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'alteração de IA de apoio negada' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  UPDATE crm.clientes
  SET ia_apoio_ativa = p_ativa, updated_by = p_autor_id, updated_at = now()
  WHERE id = p_cliente_id
  RETURNING * INTO v_cliente;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cliente não encontrado' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_cliente;
END;
$$;

REVOKE ALL ON FUNCTION crm.definir_ia_apoio(uuid, boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.definir_ia_apoio(uuid, boolean, uuid) TO service_role;
