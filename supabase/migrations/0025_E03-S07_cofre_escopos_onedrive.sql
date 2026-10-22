-- Description: Estende o regex de escopo de `configuracoes.salvar_segredo_integracao`/
--              `obter_segredo_integracao` (0016) para aceitar os dois escopos de Vault que
--              ADR-0019/design-tecnico.md Sec2 exigem para o OneDrive: `microsoft-graph:<uuid>`
--              (refresh token da integração) e `upload-sessao:<uuid>` (referência da sessão de
--              upload do Graph, por versão). 0016 é imutável (convenção do projeto) — esta
--              migration só troca o corpo das duas funções via CREATE OR REPLACE, mantendo os
--              quatro prefixos existentes intactos. Preparação isolada antes de Fase 5 (US2) para
--              as 3 frentes paralelas (onedrive-oauth/vincular_pasta, envio-comandos,
--              arquivo-processar) não precisarem tocar o mesmo arquivo de função ao mesmo tempo.
-- Story: E03-S07
-- Created: 2026-10-21

-- Rollback:
--   (reverte para o regex de 0016, só os 4 prefixos originais)
--   CREATE OR REPLACE FUNCTION configuracoes.salvar_segredo_integracao(p_escopo text, p_valor text)
--   RETURNS void LANGUAGE plpgsql SECURITY DEFINER
--   SET search_path = pg_catalog, configuracoes, vault AS $$
--   DECLARE v_cofre_id uuid;
--   BEGIN
--     IF auth.role() <> 'service_role' THEN
--       RAISE EXCEPTION 'acesso ao cofre negado' USING ERRCODE = '42501';
--     END IF;
--     IF p_escopo !~ '^(evolution|openrouter|meta-whatsapp|meta-instagram):[0-9a-f-]{36}$'
--        OR length(p_valor) = 0 THEN
--       RAISE EXCEPTION 'referência de cofre inválida' USING ERRCODE = '22023';
--     END IF;
--     SELECT cofre_id INTO v_cofre_id FROM configuracoes.referencias_cofre
--       WHERE escopo = p_escopo FOR UPDATE;
--     IF v_cofre_id IS NULL THEN
--       SELECT vault.create_secret(p_valor, 'akros/' || p_escopo, 'Credencial gerida pela Akros')
--         INTO v_cofre_id;
--       INSERT INTO configuracoes.referencias_cofre (escopo, cofre_id) VALUES (p_escopo, v_cofre_id);
--     ELSE
--       PERFORM vault.update_secret(v_cofre_id, p_valor, 'akros/' || p_escopo, 'Credencial gerida pela Akros');
--       UPDATE configuracoes.referencias_cofre SET updated_at = now() WHERE escopo = p_escopo;
--     END IF;
--   END; $$;

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
  IF p_escopo !~ '^(evolution|openrouter|meta-whatsapp|meta-instagram|microsoft-graph|upload-sessao):[0-9a-f-]{36}$'
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

CREATE OR REPLACE FUNCTION configuracoes.obter_segredo_integracao(p_escopo text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, configuracoes, vault
AS $$
DECLARE
  v_valor text;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'acesso ao cofre negado' USING ERRCODE = '42501';
  END IF;

  SELECT cofre.decrypted_secret INTO v_valor
  FROM configuracoes.referencias_cofre referencia
  JOIN vault.decrypted_secrets cofre ON cofre.id = referencia.cofre_id
  WHERE referencia.escopo = p_escopo;

  RETURN v_valor;
END;
$$;

REVOKE ALL ON FUNCTION configuracoes.salvar_segredo_integracao(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION configuracoes.obter_segredo_integracao(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION configuracoes.salvar_segredo_integracao(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION configuracoes.obter_segredo_integracao(text) TO service_role;
