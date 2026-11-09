-- E13-S15 (0040): configuração da transcrição admin-only, ativação exige aceite + verificação no próprio
-- banco, uma linha, chave só no Vault e escopos antigos do cofre preservados (OneDrive de 0025).
-- Roda em Postgres limpo com o shim, depois de todas as migrations.
\set ON_ERROR_STOP on

-- ───────────────────────── Vault: escopo novo SEM perder os anteriores ─────────────────────────
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  SELECT configuracoes.salvar_segredo_integracao(
    'transcricao:a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', '{"apiKey":"chave-do-provedor"}');
  DO $$
  DECLARE
    v_escopo text;
  BEGIN
    ASSERT configuracoes.obter_segredo_integracao('transcricao:a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1')
      = '{"apiKey":"chave-do-provedor"}', 'service_role lê a chave da transcrição';
    -- Regressão: os escopos do OneDrive (0025) e os da E13-S15 (0039) continuam aceitos.
    FOREACH v_escopo IN ARRAY ARRAY[
      'microsoft-graph:a2a2a2a2-a2a2-42a2-82a2-a2a2a2a2a2a2',
      'upload-sessao:a3a3a3a3-a3a3-43a3-83a3-a3a3a3a3a3a3',
      'evolution-servidor:a4a4a4a4-a4a4-44a4-84a4-a4a4a4a4a4a4',
      'evolution:a5a5a5a5-a5a5-45a5-85a5-a5a5a5a5a5a5',
      'openrouter:a6a6a6a6-a6a6-46a6-86a6-a6a6a6a6a6a6'
    ] LOOP
      PERFORM configuracoes.salvar_segredo_integracao(v_escopo, 'x');
    END LOOP;
    BEGIN
      PERFORM configuracoes.salvar_segredo_integracao('transcricao-x:a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', 'x');
      ASSERT false, 'escopo fora da lista não pode ser aceito';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
  END $$;
COMMIT;

-- ───────────────────────── Tabela: uma linha, valores válidos, ativar exige prova ─────────────────────────
BEGIN;
  SET LOCAL ROLE service_role;
  SET LOCAL request.jwt.claims = '{"role":"service_role"}';
  INSERT INTO configuracoes.transcricao_audio (id, provedor, modelo, idioma, indicio)
  VALUES ('a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1', 'groq', 'whisper-large-v3-turbo', NULL, 'wxyz');
  DO $$
  BEGIN
    ASSERT (SELECT ativa FROM configuracoes.transcricao_audio) = false, 'nasce desligada';
    BEGIN
      INSERT INTO configuracoes.transcricao_audio (provedor, modelo) VALUES ('openrouter', 'openai/whisper-large-v3');
      ASSERT false, 'só pode existir UMA configuração de transcrição';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
      UPDATE configuracoes.transcricao_audio SET provedor = 'openai';
      ASSERT false, 'provedor fora da lista não pode ser gravado (OpenAI whisper-1 é descontinuado)';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
      UPDATE configuracoes.transcricao_audio SET modelo = 'modelo com espaço; drop';
      ASSERT false, 'modelo só aceita caracteres de identificador';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
      UPDATE configuracoes.transcricao_audio SET idioma = 'portugues';
      ASSERT false, 'idioma é ISO 639-1 (duas letras) ou nulo';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
      UPDATE configuracoes.transcricao_audio SET indicio = '12345';
      ASSERT false, 'o indício guarda no máximo 4 caracteres (nunca a chave)';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
      UPDATE configuracoes.transcricao_audio SET ativa = true;
      ASSERT false, 'ligar sem aceite e sem verificação não pode passar';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
      UPDATE configuracoes.transcricao_audio SET ativa = true, aceite_envio_em = now();
      ASSERT false, 'aceite sem verificação da chave não basta';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
      UPDATE configuracoes.transcricao_audio SET ativa = true, verificada_em = now();
      ASSERT false, 'verificação sem aceite do envio de dados não basta';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    UPDATE configuracoes.transcricao_audio SET ativa = true, aceite_envio_em = now(), verificada_em = now();
    ASSERT (SELECT ativa FROM configuracoes.transcricao_audio), 'com as duas provas liga';
  END $$;
COMMIT;

-- ───────────────────────── Leitura só admin; escrita só pelo servidor ─────────────────────────
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"b1b1b1b1-b1b1-41b1-81b1-b1b1b1b1b1b1","app_metadata":{"role":"admin"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM configuracoes.transcricao_audio) = 1, 'admin vê a configuração';
    BEGIN
      UPDATE configuracoes.transcricao_audio SET ativa = false;
      ASSERT false, 'admin NÃO altera a configuração direto: só pela função do servidor';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      INSERT INTO configuracoes.transcricao_audio (provedor, modelo) VALUES ('groq', 'whisper-large-v3');
      ASSERT false, 'admin NÃO insere direto';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"b2b2b2b2-b2b2-42b2-82b2-b2b2b2b2b2b2","app_metadata":{"role":"cliente"}}';
  DO $$
  BEGIN
    ASSERT (SELECT count(*) FROM configuracoes.transcricao_audio) = 0, 'cliente não vê a configuração';
  END $$;
COMMIT;

BEGIN;
  SET LOCAL ROLE anon;
  DO $$
  BEGIN
    BEGIN
      PERFORM * FROM configuracoes.transcricao_audio;
      ASSERT false, 'anon não lê a configuração';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END $$;
COMMIT;
