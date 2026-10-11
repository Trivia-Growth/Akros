-- Description: Visibilidade de jornada/documentos por participacao + papel (ADR-0018,
--              design-tecnico.md Sec1.3). Fecha o modelo mono-titular (cliente_id =
--              crm.meu_cliente_id()) nas 3 tabelas que ainda dependiam dele para SELECT --
--              documentos.documentos, jornada.fases, jornada.etapas passam a usar
--              crm.meus_casos()/crm.tenho_papel() (0017), cobrindo os dois modelos durante a
--              migracao. Tambem fecha uma lacuna descoberta em 2026-10-11: nenhuma migration
--              anterior previa `comandos.idempotencia`, que `_shared/idempotencia.ts` (T022)
--              precisa para toda Edge Function de comando desta feature -- entra primeiro neste
--              arquivo, por ser independente do resto.
-- Story: E03-S07
-- Created: 2026-10-11

-- Rollback:
--   DROP TRIGGER IF EXISTS audit_notas_internas ON crm.notas_internas;
--   DROP TRIGGER IF EXISTS audit_decisoes_revisao ON documentos.decisoes_revisao;
--   DROP POLICY IF EXISTS "participante_ve_decisao_do_documento_no_seu_papel" ON documentos.decisoes_revisao;
--   DROP POLICY IF EXISTS "admin_ve_todas_decisoes_revisao" ON documentos.decisoes_revisao;
--   DROP POLICY IF EXISTS "admin_ve_todas_notas_internas" ON crm.notas_internas;
--   DROP TABLE IF EXISTS crm.notas_internas;
--   DROP TABLE IF EXISTS documentos.decisoes_revisao;
--   DROP FUNCTION IF EXISTS documentos.fase_liberada_para_portal(uuid);
--   -- Restaura as policies de SELECT substituidas por esta migration (0005/0003):
--   DROP POLICY IF EXISTS "participante_ve_documento_do_caso_no_seu_papel" ON documentos.documentos;
--   CREATE POLICY "cliente_ve_os_proprios_documentos" ON documentos.documentos
--     FOR SELECT USING (cliente_id = crm.meu_cliente_id());
--   DROP POLICY IF EXISTS "participante_ve_fase_do_caso" ON jornada.fases;
--   CREATE POLICY "cliente_ve_fases_da_propria_jornada" ON jornada.fases
--     FOR SELECT USING (jornada_id IN (SELECT id FROM jornada.jornadas WHERE cliente_id = crm.meu_cliente_id()));
--   DROP POLICY IF EXISTS "participante_ve_etapa_de_fase_liberada" ON jornada.etapas;
--   CREATE POLICY "cliente_ve_etapas_da_propria_jornada" ON jornada.etapas
--     FOR SELECT USING (
--       fase_id IN (
--         SELECT f.id FROM jornada.fases f
--         JOIN jornada.jornadas j ON j.id = f.jornada_id
--         WHERE j.cliente_id = crm.meu_cliente_id()
--       )
--     );
--   ALTER TABLE documentos.documentos DROP CONSTRAINT IF EXISTS documento_sujeito_coerente,
--     DROP COLUMN IF EXISTS jornada_id, DROP COLUMN IF EXISTS sujeito_tipo,
--     DROP COLUMN IF EXISTS sujeito_participante_id, DROP COLUMN IF EXISTS sujeito_familiar_id,
--     DROP COLUMN IF EXISTS papel_dirigido, DROP COLUMN IF EXISTS envio_conjunto,
--     DROP COLUMN IF EXISTS restrito_ao_papel, DROP COLUMN IF EXISTS prazo_em,
--     DROP COLUMN IF EXISTS instrucao, DROP COLUMN IF EXISTS revisao;
--   ALTER TABLE jornada.etapas DROP COLUMN IF EXISTS prazo_em, DROP COLUMN IF EXISTS revisao;
--   ALTER TABLE jornada.fases DROP COLUMN IF EXISTS revisao;
--   ALTER TABLE jornada.jornadas DROP COLUMN IF EXISTS contrato_id,
--     DROP COLUMN IF EXISTS levantamento_estado, DROP COLUMN IF EXISTS conferido_por,
--     DROP COLUMN IF EXISTS conferido_em, DROP COLUMN IF EXISTS origem_situacao_inicial,
--     DROP COLUMN IF EXISTS revisao;
--   REVOKE ALL ON comandos.idempotencia FROM service_role;
--   DROP TABLE IF EXISTS comandos.idempotencia;
--   DROP SCHEMA IF EXISTS comandos;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- comandos.idempotencia -- lacuna descoberta em 2026-10-11 (design-tecnico.md Sec1.3,
-- "Correcao em 2026-10-11"). Generico para toda Edge Function de comando desta feature que
-- exige idempotencyKey (_shared/idempotencia.ts, T022). Comando client-side nunca consulta isto
-- direto, so o handler do servidor (service_role).
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS comandos;

CREATE TABLE comandos.idempotencia (
  chave          text PRIMARY KEY,
  hash_conteudo  text NOT NULL,
  resultado      jsonb NOT NULL,
  criado_por     uuid NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Sem auditoria aqui: estado tecnico de dedup de requisicao, nao entidade de negocio -- mesmo
-- criterio usado para nao auditar tabela puramente tecnica (nenhum precedente de "rate limit"
-- com trigger de auditoria no repo; audit.* em si tambem nao se audita).
ALTER TABLE comandos.idempotencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE comandos.idempotencia FORCE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA comandos TO service_role;
GRANT ALL ON comandos.idempotencia TO service_role;
-- Sem GRANT a authenticated, sem policy: RLS FORCE + zero privilegio de tabela nega tudo.
-- service_role tem BYPASSRLS por padrao no Supabase, FORCE nao o alcanca (mesmo criterio de
-- audit.eventos, 0008). Tabela tecnica: so Edge Function com service_role acessa.

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- jornada.* -- colunas novas (independente do bloco acima)
-- ─────────────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE jornada.jornadas
  ADD COLUMN contrato_id uuid,
  ADD COLUMN levantamento_estado text NOT NULL DEFAULT 'incompleto'
    CHECK (levantamento_estado IN ('incompleto', 'conferido')),
  ADD COLUMN conferido_por uuid,
  ADD COLUMN conferido_em timestamptz,
  ADD COLUMN origem_situacao_inicial text,
  ADD COLUMN revisao integer NOT NULL DEFAULT 1;

-- `NOT VALID` de proposito (mesmo criterio apontado pelo Squawk e ja usado em 0011/0016):
-- FK validando de cara exige scan + SHARE ROW EXCLUSIVE nas duas tabelas. `NOT VALID` ja vale
-- pra toda linha nova; a migration e imutavel e pode reaplicar num banco maior no futuro. Sem
-- VALIDATE CONSTRAINT de seguimento nesta story -- fora de escopo de T014 (ver 0011/0012 pro
-- padrao, quando a validacao for necessaria).
ALTER TABLE jornada.jornadas
  ADD CONSTRAINT jornadas_contrato_fk FOREIGN KEY (contrato_id) REFERENCES crm.contratos(id) NOT VALID;

ALTER TABLE jornada.fases
  ADD COLUMN revisao integer NOT NULL DEFAULT 1;

ALTER TABLE jornada.etapas
  ADD COLUMN prazo_em date,
  ADD COLUMN revisao integer NOT NULL DEFAULT 1;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- documentos.documentos -- colunas novas de sujeito/papel (independente dos blocos acima)
-- ─────────────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE documentos.documentos
  ADD COLUMN jornada_id uuid,
  ADD COLUMN sujeito_tipo text NOT NULL DEFAULT 'caso'
    CHECK (sujeito_tipo IN ('caso', 'participante', 'familiar')),
  ADD COLUMN sujeito_participante_id uuid,
  ADD COLUMN sujeito_familiar_id text,
  ADD COLUMN papel_dirigido text
    CHECK (papel_dirigido IN ('aplicante', 'beneficiario', 'organizacao_aplicante', 'familiar_apoio')),
  ADD COLUMN envio_conjunto boolean NOT NULL DEFAULT false,
  ADD COLUMN restrito_ao_papel boolean NOT NULL DEFAULT false,
  ADD COLUMN prazo_em date,
  ADD COLUMN instrucao text,
  ADD COLUMN revisao integer NOT NULL DEFAULT 1;

-- Mesmo criterio de NOT VALID acima -- documentos.documentos ja tem linhas em produção.
ALTER TABLE documentos.documentos
  ADD CONSTRAINT documentos_jornada_fk FOREIGN KEY (jornada_id) REFERENCES jornada.jornadas(id) NOT VALID;
ALTER TABLE documentos.documentos
  ADD CONSTRAINT documentos_sujeito_participante_fk FOREIGN KEY (sujeito_participante_id)
    REFERENCES crm.participantes(id) NOT VALID;

-- Espelha crm.participante_sujeito_coerente (0017): 'caso' e o documento do caso como um todo
-- (nenhuma das duas referencias), 'participante'/'familiar' exigem exatamente a referencia
-- correspondente preenchida e a outra vazia. NOT VALID pelo mesmo motivo das FKs acima.
ALTER TABLE documentos.documentos
  ADD CONSTRAINT documento_sujeito_coerente CHECK (
    (sujeito_tipo = 'caso' AND sujeito_participante_id IS NULL AND sujeito_familiar_id IS NULL)
    OR (sujeito_tipo = 'participante' AND sujeito_participante_id IS NOT NULL AND sujeito_familiar_id IS NULL)
    OR (sujeito_tipo = 'familiar' AND sujeito_familiar_id IS NOT NULL AND sujeito_participante_id IS NULL)
  ) NOT VALID;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- documentos.decisoes_revisao -- append-only (nunca UPDATE/DELETE, nem admin, nem service_role)
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE documentos.decisoes_revisao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id    uuid NOT NULL REFERENCES documentos.documentos(id),
  versao_id       uuid NOT NULL, -- FK adicionada em 0020_E03-S07_arquivos_onedrive.sql
  decisao         text NOT NULL CHECK (decisao IN ('aprovado', 'ajustes')),
  justificativa   text,
  decidido_por    uuid NOT NULL,
  decidido_em     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT decisao_ajustes_exige_justificativa CHECK (decisao <> 'ajustes' OR justificativa IS NOT NULL)
);

-- `documentos` ja tem `ALTER DEFAULT PRIVILEGES IN SCHEMA documentos GRANT ALL ON TABLES TO
-- service_role` (0005) -- toda tabela nova neste schema recebe ALL (inclusive UPDATE/DELETE)
-- automaticamente. Append-only (mesmo criterio de audit.eventos, 0008: "nunca conceder
-- UPDATE/DELETE a ninguem" via GRANT, nao via policy) exige revogar explicitamente aqui, ou o
-- default privilege silenciosamente destrancaria a tabela so para service_role.
REVOKE UPDATE, DELETE ON documentos.decisoes_revisao FROM service_role;

ALTER TABLE documentos.decisoes_revisao ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos.decisoes_revisao FORCE ROW LEVEL SECURITY;

GRANT SELECT ON documentos.decisoes_revisao TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- crm.notas_internas -- admin-only, nunca no DTO do portal
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE crm.notas_internas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid NOT NULL REFERENCES crm.clientes(id),
  conteudo    text NOT NULL,
  autor_id    uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm.notas_internas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.notas_internas FORCE ROW LEVEL SECURITY;

-- Admin-only por design: zero GRANT a `authenticated` (nem SELECT) -- mais restritivo que o
-- padrao "GRANT SELECT a authenticated + policy so-admin" usado em crm.contratos (0017,
-- SPEC_DEVIATION la documentada). Aqui a nota interna nunca deve ser alcancavel nem por uma
-- sessao autenticada com claim admin via PostgREST direto -- so service_role (Edge Function de
-- back-office) le/escreve. A policy abaixo documenta a intencao e vale se um GRANT SELECT a
-- authenticated for adicionado no futuro; sem ele, authenticated recebe insufficient_privilege
-- antes mesmo da RLS -- "nunca no DTO do portal" levado ao limite.
GRANT ALL ON crm.notas_internas TO service_role;

CREATE POLICY "admin_ve_todas_notas_internas" ON crm.notas_internas
  FOR SELECT USING (crm.e_admin());

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- documentos.fase_liberada_para_portal -- FR-021. Sem SECURITY DEFINER: roda com o privilegio
-- de quem chama, a RLS de jornada.fases (ja FORCE) decide o que a funcao enxerga.
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE FUNCTION documentos.fase_liberada_para_portal(p_fase_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  -- p_fase_id NULL ou sem fase correspondente -> nenhuma linha -> NULL -> COALESCE fecha em
  -- false (fail-closed). Documento sem fase (ex.: contrato) e tratado FORA desta funcao: a
  -- policy de SELECT so chama isto quando fase_id IS NOT NULL.
  SELECT COALESCE(
    (SELECT status IN ('liberada', 'em_andamento', 'concluida') FROM jornada.fases WHERE id = p_fase_id),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION documentos.fase_liberada_para_portal(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- Policies de SELECT por participacao + papel -- substituem as policies de cliente de 0005/0003.
-- As policies de admin ("admin_ve_todos_documentos", "admin_ve_todas_fases",
-- "admin_ve_todas_etapas") NAO sao tocadas.
-- ─────────────────────────────────────────────────────────────────────────────────────────────

DROP POLICY "cliente_ve_os_proprios_documentos" ON documentos.documentos;

CREATE POLICY "participante_ve_documento_do_caso_no_seu_papel" ON documentos.documentos
  FOR SELECT USING (
    cliente_id IN (SELECT crm.meus_casos())
    AND (
      restrito_ao_papel = false
      OR papel_dirigido IS NULL
      OR crm.tenho_papel(cliente_id, papel_dirigido)
    )
    AND (fase_id IS NULL OR documentos.fase_liberada_para_portal(fase_id))
  );

DROP POLICY "cliente_ve_fases_da_propria_jornada" ON jornada.fases;

-- Sem restricao de liberacao: a fase em si deve ser visivel mesmo bloqueada, para o cliente
-- saber que existe e esta bloqueada (so as etapas dela ficam escondidas, ver abaixo).
CREATE POLICY "participante_ve_fase_do_caso" ON jornada.fases
  FOR SELECT USING (
    jornada_id IN (SELECT id FROM jornada.jornadas WHERE cliente_id IN (SELECT crm.meus_casos()))
  );

DROP POLICY "cliente_ve_etapas_da_propria_jornada" ON jornada.etapas;

CREATE POLICY "participante_ve_etapa_de_fase_liberada" ON jornada.etapas
  FOR SELECT USING (
    fase_id IN (
      SELECT f.id FROM jornada.fases f
      JOIN jornada.jornadas j ON j.id = f.jornada_id
      WHERE j.cliente_id IN (SELECT crm.meus_casos())
    )
    AND documentos.fase_liberada_para_portal(fase_id)
  );

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- documentos.decisoes_revisao -- policies de SELECT, analogas as de documentos.documentos
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE POLICY "admin_ve_todas_decisoes_revisao" ON documentos.decisoes_revisao
  FOR SELECT USING (crm.e_admin());

-- Mesmo predicado de "participante_ve_documento_do_caso_no_seu_papel", via join em
-- documento_id -- participante le a decisao da versao que o seu papel alcanca.
CREATE POLICY "participante_ve_decisao_do_documento_no_seu_papel" ON documentos.decisoes_revisao
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documentos.documentos d
      WHERE d.id = decisoes_revisao.documento_id
        AND d.cliente_id IN (SELECT crm.meus_casos())
        AND (
          d.restrito_ao_papel = false
          OR d.papel_dirigido IS NULL
          OR crm.tenho_papel(d.cliente_id, d.papel_dirigido)
        )
        AND (d.fase_id IS NULL OR documentos.fase_liberada_para_portal(d.fase_id))
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- Auditoria (padrao de 0008) nas 2 tabelas de negocio novas. comandos.idempotencia fica de
-- fora de proposito (ver comentario acima, estado tecnico de dedup).
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE TRIGGER audit_decisoes_revisao AFTER INSERT OR UPDATE OR DELETE ON documentos.decisoes_revisao
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_notas_internas AFTER INSERT OR UPDATE OR DELETE ON crm.notas_internas
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
