-- Description: Transcrição de áudio recebido por canal (E13-S15, ADR-0022): configuração global da
--              instalação (provedor, modelo, idioma, aceite do envio de dados, prova da chave) e
--              escopo do Vault para a chave do provedor. A chave NUNCA entra na tabela.
-- Story: E13-S15
-- Created: 2026-10-28

-- Reverso: DROP TABLE IF EXISTS configuracoes.transcricao_audio;
--          (reverter a regex de escopo em referencias_cofre e salvar_segredo_integracao para a de 0039)
--          Só reverter enquanto nenhuma transcrição estiver ativa; o texto já gravado nas conversas
--          fica (é histórico da conversa).

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 1. Vault: escopo `transcricao:<id>` para a chave do provedor de transcrição
--    (mantém TODOS os escopos anteriores, inclusive os do OneDrive de 0025)
-- ─────────────────────────────────────────────────────────────────────────────────────────────
ALTER TABLE configuracoes.referencias_cofre DROP CONSTRAINT referencias_cofre_escopo_check;
ALTER TABLE configuracoes.referencias_cofre
  ADD CONSTRAINT referencias_cofre_escopo_check
  CHECK (escopo ~ '^(evolution|evolution-servidor|openrouter|meta-whatsapp|meta-instagram|microsoft-graph|upload-sessao|transcricao):[0-9a-f-]{36}$')
  NOT VALID;

CREATE OR REPLACE FUNCTION configuracoes.salvar_segredo_integracao(p_escopo text, p_valor text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, configuracoes, vault
AS $$
DECLARE
  v_cofre_id uuid;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'acesso ao cofre negado' USING ERRCODE = '42501';
  END IF;
  IF p_escopo !~ '^(evolution|evolution-servidor|openrouter|meta-whatsapp|meta-instagram|microsoft-graph|upload-sessao|transcricao):[0-9a-f-]{36}$'
     OR length(p_valor) = 0 THEN
    RAISE EXCEPTION 'referência de cofre inválida' USING ERRCODE = '22023';
  END IF;

  SELECT cofre_id INTO v_cofre_id
  FROM configuracoes.referencias_cofre
  WHERE escopo = p_escopo
  FOR UPDATE;

  IF v_cofre_id IS NULL THEN
    SELECT vault.create_secret(p_valor, 'akros/' || p_escopo, 'Credencial gerida pela Akros')
      INTO v_cofre_id;
    INSERT INTO configuracoes.referencias_cofre (escopo, cofre_id)
    VALUES (p_escopo, v_cofre_id);
  ELSE
    PERFORM vault.update_secret(
      v_cofre_id,
      p_valor,
      'akros/' || p_escopo,
      'Credencial gerida pela Akros'
    );
    UPDATE configuracoes.referencias_cofre SET updated_at = now() WHERE escopo = p_escopo;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 2. Configuração da transcrição (uma linha: single-tenant, ADR-0009)
--    A chave do provedor NUNCA entra aqui: fica no Vault (escopo `transcricao:<id>`).
--    `ativa` exige as duas provas no próprio banco: aceite de que o áudio sai do Akros para o
--    provedor, e chave+modelo verificados. A função do servidor também confere; o CHECK é o cinto.
-- ─────────────────────────────────────────────────────────────────────────────────────────────
CREATE TABLE configuracoes.transcricao_audio (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ativa           boolean NOT NULL DEFAULT false,
  provedor        text NOT NULL CHECK (provedor IN ('groq', 'openrouter')),
  modelo          text NOT NULL CHECK (modelo ~ '^[A-Za-z0-9._/-]{1,80}$'),
  -- ISO 639-1; NULL = o modelo detecta (cliente pode falar PT ou EN).
  idioma          text CHECK (idioma IS NULL OR idioma ~ '^[a-z]{2}$'),
  indicio         text NOT NULL DEFAULT '' CHECK (length(indicio) <= 4),
  aceite_envio_em timestamptz,
  aceite_envio_por uuid,
  verificada_em   timestamptz,
  atualizado_por  uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transcricao_ativa_exige_prova
    CHECK (NOT ativa OR (aceite_envio_em IS NOT NULL AND verificada_em IS NOT NULL))
);
CREATE UNIQUE INDEX transcricao_audio_unica ON configuracoes.transcricao_audio ((true));

ALTER TABLE configuracoes.transcricao_audio ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes.transcricao_audio FORCE ROW LEVEL SECURITY;

-- Leitura só admin; escrita só pelo servidor (Edge Function com service_role). Sem DELETE.
GRANT SELECT ON configuracoes.transcricao_audio TO authenticated;
GRANT SELECT, INSERT, UPDATE ON configuracoes.transcricao_audio TO service_role;

CREATE POLICY "so_admin_ve_transcricao_audio" ON configuracoes.transcricao_audio
  FOR SELECT USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

CREATE TRIGGER audit_configuracoes_transcricao_audio
  AFTER INSERT OR UPDATE OR DELETE ON configuracoes.transcricao_audio
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
