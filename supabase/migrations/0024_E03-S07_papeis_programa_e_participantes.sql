-- Description: Fecha a lacuna de dependencia encontrada em T042-T045 (fase 4, US6): o dominio
--              TypeScript (apps/web/src/features/programas/domain/types.ts) ja declara
--              `Programa.papeis` (`PapelDoPrograma[]`), mas `programas.programas` nao tinha a
--              coluna correspondente -- sem ela, `convidar_participante` nao tinha como validar
--              "papel dentro do conjunto do programa" (FR-017/FR-019) no servidor, so no
--              cliente, que e exatamente o que este projeto proibe (nunca confiar em validacao
--              so do lado do browser para regra de seguranca). Esta migration adiciona a coluna
--              primeiro, depois as tres RPCs de T046-T048 (US6, ADR-0018).
--
--              `crm.convidar_participante`, `crm.revogar_participante` e
--              `crm.solicitar_documento` seguem o MESMO molde `SECURITY DEFINER` de
--              `crm.registrar_contrato`/`crm.preparar_caso` (0022, releia como modelo literal):
--              guarda `auth.role() <> 'service_role'` sempre primeiro, so DEPOIS
--              `set_config('request.jwt.claims', ...)` com o autor real, para que
--              `audit.registrar_mudanca()` (trigger generico, 0008) capture `auth.uid()` correto.
--
--              Decisao sobre E12-S04 (login por convite, ainda sem nenhum codigo -- so
--              `specs/002-login-convite-supabase/spec.md` em Draft): `convidar_participante`
--              NAO envia e-mail, NAO gera link magico, NAO cria usuario no Supabase Auth -- isso
--              e literalmente o escopo de E12-S04, que ainda nao existe. Esta RPC so cria a
--              linha de `crm.participantes` com `auth_user_id = NULL` (participante existe, tem
--              papel, e legitimo -- ADR-0018 ja modela isto: "participante sem acesso ao portal
--              e valido"); `email`/`nome_exibicao` ficam preenchidos para que, quando E12-S04
--              existir, o fluxo de convite real encontre esta linha pelo e-mail e preencha
--              `auth_user_id`. Participante que nunca vai ter login (organizacao aplicante sem
--              login proprio, familiar que so aparece como sujeito de documento) nasce do mesmo
--              jeito -- a coluna ja aceita isso sem mudanca de schema, entao nao ha parametro
--              `p_recebe_acesso` separado: a intencao "nunca vai logar" e so documentacional,
--              nao um ramo de codigo.
--
--              `crm.solicitar_documento` copia `papel_dirigido`/`restrito_ao_papel`/
--              `envio_conjunto` do catalogo do programa (`programas.programas.
--              documentos_exigidos`, filtrando o requisito por `tipo`), nunca do parametro
--              recebido -- regra explicita de design-tecnico.md Sec2 e de
--              contracts/operacoes.md ("marca de restrito e copiada do programa, nao digitada
--              livremente"). Requisito e localizado pelo campo `tipo` dentro do array JSONB
--              (mesmo shape de `RequisitoDocumento`, programas/domain/types.ts) -- forma mais
--              simples que nao exige o chamador adivinhar um id interno do template.
-- Story: E03-S07
-- Created: 2026-10-16

-- Rollback: DROP FUNCTION IF EXISTS crm.solicitar_documento(uuid, uuid, text, text, uuid, text, text, date, text, uuid);
--           DROP FUNCTION IF EXISTS crm.revogar_participante(uuid, uuid);
--           DROP FUNCTION IF EXISTS crm.convidar_participante(uuid, text, text, text, uuid, text, text, uuid);
--           ALTER TABLE programas.programas DROP COLUMN IF EXISTS papeis;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- programas.programas.papeis -- espelha PapelDoPrograma[] (programas/domain/types.ts, T042-045).
-- Default vazio: programas existentes continuam validos (catalogo nasce sem papel declarado ate
-- alguem popular via UI/migration de dados futura -- nao inventamos valor aqui, nao sabemos os
-- codigos/versoes reais de producao nesta sessao). Mesmo criterio ja usado em 0019
-- (jornada.jornadas.levantamento_estado): ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT com
-- valor constante nao exige reescrita de tabela (Postgres 11+), sem necessidade de NOT VALID.
-- ─────────────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE programas.programas
  ADD COLUMN papeis jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN programas.programas.papeis IS
  'E03-S07 (US6) / ADR-0018 (FR-017/FR-019): array de {"papel": "aplicante"|"beneficiario"|'
  '"organizacao_aplicante"|"familiar_apoio", "obrigatorio": boolean} -- mesmo shape de '
  'PapelDoPrograma (programas/domain/types.ts). Papel fora desta lista nunca e aceito num caso '
  'deste programa (crm.convidar_participante).';

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- crm.convidar_participante -- FR-017/FR-019/FR-020. Cria a linha de crm.participantes com
-- auth_user_id = NULL sempre (ver nota de E12-S04 acima). Valida papel contra o conjunto
-- declarado pela versao do programa do caso -- congelada no contrato/jornada (ADR-0014), nunca
-- lida do catalogo "atual" sem passar pelo programa_id/programa_versao do caso.
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION crm.convidar_participante(
  p_cliente_id uuid,
  p_papel text,
  p_sujeito_tipo text,
  p_familiar_id text,
  p_organizacao_id uuid,
  p_nome_exibicao text,
  p_email text,
  p_autor_id uuid
)
RETURNS crm.participantes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, jornada, programas, pg_temp
AS $$
DECLARE
  v_programa_id      text;
  v_programa_versao  text;
  v_papeis           jsonb;
  v_participante     crm.participantes%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'convite de participante negado' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  -- Ver comentário equivalente em crm.registrar_contrato/crm.preparar_caso (0022): 'role:
  -- service_role' entra no claim junto com 'sub' -- sem isto, qualquer guarda subsequente
  -- (nenhuma função aninhada aqui hoje, mas mantém o padrão uniforme das três RPCs desta
  -- migration) cairia no fallback current_user.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  -- Programa do caso: primeiro a jornada (se já instanciada), senão o contrato ativo -- mesma
  -- origem de programa_id/programa_versao usada por crm.preparar_caso (0022). Jornada e
  -- contrato guardam o MESMO par (programa_id, programa_versao) quando ambos existem
  -- (preparar_caso copia do contrato) -- não há ambiguidade entre as duas fontes, só ordem de
  -- preferência para o caso que ainda não tem jornada.
  SELECT j.programa_id, j.programa_versao INTO v_programa_id, v_programa_versao
  FROM jornada.jornadas j
  WHERE j.cliente_id = p_cliente_id;

  IF v_programa_id IS NULL THEN
    SELECT c.programa_id, c.programa_versao INTO v_programa_id, v_programa_versao
    FROM crm.contratos c
    WHERE c.cliente_id = p_cliente_id AND c.ativo = true;
  END IF;

  IF v_programa_id IS NULL THEN
    RAISE EXCEPTION 'caso sem contrato ou jornada para resolver o programa' USING ERRCODE = '22023';
  END IF;

  SELECT p.papeis INTO v_papeis
  FROM programas.programas p
  WHERE p.codigo = v_programa_id AND p.versao = v_programa_versao;

  IF v_papeis IS NULL THEN
    RAISE EXCEPTION 'programa do caso nao encontrado no catalogo' USING ERRCODE = '22023';
  END IF;

  -- FR-017/FR-019: papel fora do conjunto declarado pela versão congelada do programa é
  -- recusado aqui -- a única validação de servidor para essa regra (o cliente não é fonte de
  -- autoridade, ver ADR-0018 item 3).
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_papeis) AS papel_do_programa
    WHERE papel_do_programa ->> 'papel' = p_papel
  ) THEN
    RAISE EXCEPTION 'papel fora do conjunto do programa' USING ERRCODE = '22023';
  END IF;

  -- auth_user_id sempre NULL nesta task -- ver "Decisão sobre E12-S04" no cabeçalho desta
  -- migration. Se os parâmetros violarem crm.participante_sujeito_coerente (0017), a exceção de
  -- CHECK propaga sem tentativa de adivinhar a intenção do chamador (instrução explícita da
  -- task).
  INSERT INTO crm.participantes (
    cliente_id, papel, sujeito_tipo, familiar_id, organizacao_id,
    nome_exibicao, email, auth_user_id, estado, convidado_por, convidado_em
  ) VALUES (
    p_cliente_id, p_papel, p_sujeito_tipo, p_familiar_id, p_organizacao_id,
    p_nome_exibicao, p_email, NULL, 'ativo', p_autor_id, now()
  )
  RETURNING * INTO v_participante;

  RETURN v_participante;
END;
$$;

REVOKE ALL ON FUNCTION crm.convidar_participante(uuid, text, text, text, uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.convidar_participante(uuid, text, text, text, uuid, text, text, uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- crm.revogar_participante -- FR-020/ADR-0018 item 7. Toca SÓ a linha do participante alvo:
-- revogar um participante NUNCA afeta os demais do mesmo caso (teste mais importante desta
-- função, verificado contra Postgres real na task).
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION crm.revogar_participante(
  p_participante_id uuid,
  p_autor_id uuid
)
RETURNS crm.participantes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, pg_temp
AS $$
DECLARE
  v_participante crm.participantes%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'revogacao de participante negada' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  SELECT * INTO v_participante FROM crm.participantes WHERE id = p_participante_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'participante inexistente' USING ERRCODE = '22023';
  END IF;

  -- WHERE id = p_participante_id -- só esta linha, por desenho (nenhum outro predicado,
  -- nenhuma atualização em massa por cliente_id/papel). É o que garante que revogar um
  -- participante não afeta os demais do mesmo caso.
  UPDATE crm.participantes
  SET estado = 'revogado', revogado_por = p_autor_id, revogado_em = now(), updated_at = now()
  WHERE id = p_participante_id
  RETURNING * INTO v_participante;

  RETURN v_participante;
END;
$$;

REVOKE ALL ON FUNCTION crm.revogar_participante(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.revogar_participante(uuid, uuid) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- crm.solicitar_documento -- FR-016/FR-017/FR-018. papel_dirigido/restrito_ao_papel/
-- envio_conjunto vêm SEMPRE do catálogo do programa (documentos_exigidos), nunca de parâmetro
-- do chamador -- essa cópia é a regra de segurança mais sensível desta função (ver também o
-- Zod .strict() de solicitarDocumento em _shared/caso-comandos.ts, que nem aceita esses três
-- campos no corpo da requisição).
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION crm.solicitar_documento(
  p_cliente_id uuid,
  p_fase_id uuid,
  p_requisito_tipo text,
  p_sujeito_tipo text,
  p_sujeito_participante_id uuid,
  p_sujeito_familiar_id text,
  p_titulo text,
  p_prazo_em date,
  p_instrucao text,
  p_autor_id uuid
)
RETURNS documentos.documentos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, jornada, documentos, programas, pg_temp
AS $$
DECLARE
  v_jornada_id         uuid;
  v_programa_id        text;
  v_programa_versao    text;
  v_documentos_exigidos jsonb;
  v_requisito          jsonb;
  v_papel_dirigido      text;
  v_restrito_ao_papel   boolean;
  v_envio_conjunto      boolean;
  v_documento           documentos.documentos%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'solicitacao de documento negada' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  -- Confirma que a fase pertence a uma jornada DESTE cliente e já resolve o programa do caso na
  -- mesma consulta (jornada.jornadas.programa_id/programa_versao, mesma origem usada por
  -- crm.preparar_caso/crm.convidar_participante).
  SELECT j.id, j.programa_id, j.programa_versao INTO v_jornada_id, v_programa_id, v_programa_versao
  FROM jornada.fases f
  JOIN jornada.jornadas j ON j.id = f.jornada_id
  WHERE f.id = p_fase_id AND j.cliente_id = p_cliente_id;

  IF v_jornada_id IS NULL THEN
    RAISE EXCEPTION 'fase nao pertence ao caso' USING ERRCODE = '22023';
  END IF;

  -- Sujeito 'participante': precisa ser participante ATIVO do MESMO caso -- fecha o cenário
  -- "sujeito de outro caso" (US2/US6, FR-016) e "participante revogado continua sendo alvo de
  -- solicitação nova".
  IF p_sujeito_tipo = 'participante' THEN
    IF NOT EXISTS (
      SELECT 1 FROM crm.participantes
      WHERE id = p_sujeito_participante_id AND cliente_id = p_cliente_id AND estado = 'ativo'
    ) THEN
      RAISE EXCEPTION 'sujeito nao pertence ao caso' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT p.documentos_exigidos INTO v_documentos_exigidos
  FROM programas.programas p
  WHERE p.codigo = v_programa_id AND p.versao = v_programa_versao;

  IF v_documentos_exigidos IS NULL THEN
    RAISE EXCEPTION 'programa do caso nao encontrado no catalogo' USING ERRCODE = '22023';
  END IF;

  -- Localiza o requisito pelo campo `tipo` (RequisitoDocumento.tipo, programas/domain/types.ts)
  -- -- forma mais simples que não exige o chamador conhecer o id interno do template. Primeiro
  -- elemento que casar: o catálogo de um programa não é esperado a repetir o mesmo `tipo` em
  -- requisitos com marcas de restrição diferentes (duplicidade de tipo é dado malformado do
  -- catálogo, fora do escopo desta RPC resolver).
  SELECT elem INTO v_requisito
  FROM jsonb_array_elements(v_documentos_exigidos) AS elem
  WHERE elem ->> 'tipo' = p_requisito_tipo
  LIMIT 1;

  IF v_requisito IS NULL THEN
    RAISE EXCEPTION 'requisito nao encontrado no catalogo do programa' USING ERRCODE = '22023';
  END IF;

  -- Copiados do catálogo, NUNCA de parâmetro do chamador -- design-tecnico.md §2 /
  -- contracts/operacoes.md ("marca de restrito é copiada do programa, não digitada
  -- livremente").
  v_papel_dirigido := v_requisito ->> 'papelDirigido';
  v_restrito_ao_papel := COALESCE((v_requisito ->> 'restrito')::boolean, false);
  v_envio_conjunto := COALESCE((v_requisito ->> 'envioConjunto')::boolean, false);

  INSERT INTO documentos.documentos (
    cliente_id, fase_id, jornada_id, nome, tipo, status,
    sujeito_tipo, sujeito_participante_id, sujeito_familiar_id,
    papel_dirigido, restrito_ao_papel, envio_conjunto,
    prazo_em, instrucao
  ) VALUES (
    p_cliente_id, p_fase_id, v_jornada_id, p_titulo, p_requisito_tipo, 'pendente',
    p_sujeito_tipo, p_sujeito_participante_id, p_sujeito_familiar_id,
    v_papel_dirigido, v_restrito_ao_papel, v_envio_conjunto,
    p_prazo_em, p_instrucao
  )
  RETURNING * INTO v_documento;

  RETURN v_documento;
END;
$$;

REVOKE ALL ON FUNCTION crm.solicitar_documento(uuid, uuid, text, text, uuid, text, text, date, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm.solicitar_documento(uuid, uuid, text, text, uuid, text, text, date, text, uuid) TO service_role;
