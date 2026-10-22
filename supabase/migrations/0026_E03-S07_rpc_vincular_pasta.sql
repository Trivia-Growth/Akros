-- Description: Fecha a ação `vincular_pasta` (T056, design-tecnico.md §2, tabela de
--              `caso-comandos`) — liga a pasta do caso no OneDrive corporativo
--              (`arquivos.vinculos_pasta`) depois que a Edge Function já confirmou, com uma
--              chamada viva ao Microsoft Graph (`IOGraphMicrosoft.listarAncestrais`, Deno, fora
--              desta migration — plpgsql não faz HTTP), que `folderItemId` é descendente da
--              `pasta_raiz_item_id` da integração informada. `arquivos.vincular_pasta` segue o
--              MESMO molde SECURITY DEFINER de `crm.registrar_contrato`/`crm.preparar_caso`
--              (0022) e `crm.convidar_participante`/`crm.revogar_participante`/
--              `crm.solicitar_documento` (0024): guarda `auth.role() <> 'service_role'` sempre
--              primeiro, só DEPOIS `set_config('request.jwt.claims', ...)` com o autor real, para
--              que `audit.registrar_mudanca()` (trigger genérico, 0008) capture `auth.uid()`
--              correto.
--
--              `vinculos_pasta_folder_unico_idx` fecha o requisito de T057 ("pasta já vinculada a
--              outro caso → 409"): `arquivos.vinculos_pasta` (0020) só tinha
--              `UNIQUE (cliente_id, jornada_id)` — impede duplicata para o MESMO caso, não que o
--              MESMO `folder_item_id` seja vinculado a dois casos diferentes. `CREATE UNIQUE
--              INDEX` (não `ALTER TABLE ADD CONSTRAINT`), mesmo critério de 0023: squawk sinaliza
--              a forma `ADD CONSTRAINT` como lock ACCESS EXCLUSIVE evitável
--              (disallowed-unique-constraint); o índice único avulso dá a mesma garantia
--              (unique_violation/23505 no INSERT duplicado, que `erroDeNegocio()` em
--              `_shared/caso-comandos.ts` já mapeia para 409). Tabela pequena nesta fase
--              (protótipo, sem dado de produção) — sem CONCURRENTLY.
--
--              0001-0025 são imutáveis por convenção desta feature — esta migration só ADICIONA
--              índice/função novos, não toca a definição de `arquivos.vinculos_pasta` (0020).
-- Story: E03-S07
-- Created: 2026-10-21

-- Rollback: DROP FUNCTION IF EXISTS arquivos.vincular_pasta(uuid, uuid, uuid, text, text, uuid);
--           DROP INDEX IF EXISTS arquivos.vinculos_pasta_folder_unico_idx;

CREATE UNIQUE INDEX vinculos_pasta_folder_unico_idx
  ON arquivos.vinculos_pasta (integracao_id, drive_id, folder_item_id);

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- arquivos.vincular_pasta — grava o vínculo depois da validação de ancestralidade (Deno). O
-- `drive_id` do vínculo vem da PRÓPRIA integração (join abaixo), nunca de parâmetro do chamador:
-- `vinculos_pasta.drive_id` tem de ser sempre o drive da integração referenciada, nunca um valor
-- arbitrário que o chamador poderia divergir do real — fonte única de verdade para o drive.
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION arquivos.vincular_pasta(
  p_cliente_id uuid,
  p_jornada_id uuid,
  p_integracao_id uuid,
  p_folder_item_id text,
  p_caminho_exibicao text,
  p_autor_id uuid
)
RETURNS arquivos.vinculos_pasta
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = arquivos, pg_temp
AS $$
DECLARE
  v_drive_id text;
  v_vinculo   arquivos.vinculos_pasta%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'vinculo de pasta negado' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;

  -- Ver comentário equivalente em crm.registrar_contrato (0022): 'role: service_role' entra no
  -- claim junto com 'sub' -- sem isto, qualquer guarda subsequente cairia no fallback current_user.
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_autor_id::text, 'role', 'service_role')::text,
    true
  );

  SELECT drive_id INTO v_drive_id
  FROM arquivos.integracoes_microsoft
  WHERE id = p_integracao_id;

  IF v_drive_id IS NULL THEN
    RAISE EXCEPTION 'integracao Microsoft inexistente' USING ERRCODE = '22023';
  END IF;

  -- unique_violation (23505) propaga de propósito, sem catch aqui: tanto
  -- vinculo_caso_unico (0020, cliente_id+jornada_id) quanto vinculos_pasta_folder_unico_idx
  -- (acima) são conflitos reais que o admin deve ver e tentar de novo — a Edge Function mapeia
  -- 23505 -> 409 (erroDeNegocio em _shared/caso-comandos.ts, já existente).
  INSERT INTO arquivos.vinculos_pasta (
    cliente_id, jornada_id, integracao_id, drive_id, folder_item_id,
    caminho_exibicao, validado_por, validado_em, estado
  ) VALUES (
    p_cliente_id, p_jornada_id, p_integracao_id, v_drive_id, p_folder_item_id,
    p_caminho_exibicao, p_autor_id, now(), 'ativo'
  )
  RETURNING * INTO v_vinculo;

  RETURN v_vinculo;
END;
$$;

REVOKE ALL ON FUNCTION arquivos.vincular_pasta(uuid, uuid, uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION arquivos.vincular_pasta(uuid, uuid, uuid, text, text, uuid) TO service_role;
