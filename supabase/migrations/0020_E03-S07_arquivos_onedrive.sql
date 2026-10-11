-- Description: Schema `arquivos` (ADR-0019): infraestrutura compartilhada por `documentos` e
--              `pagamentos` para o fluxo "recebimento duravel -> transferencia separada" ao
--              OneDrive. Cinco tabelas, nesta ordem de dependencia: integracoes_microsoft (uma
--              conexao Microsoft por tenant, admin-only), vinculos_pasta (pasta do caso no
--              drive), versoes (cada arquivo recebido, ligado a exatamente um destino de
--              negocio -- documento, pagamento ou contrato), reservas_envio (autorizacao de
--              upload de curta duracao ao bucket) e trabalhos_transferencia (fila do processador
--              que move o arquivo do bucket para o OneDrive). Fecha as duas FK pendentes
--              deixadas em aberto por 0017 (crm.contratos.arquivo_versao_id) e 0019
--              (documentos.decisoes_revisao.versao_id). Cria tambem o bucket privado `envios` e a
--              policy de INSERT em storage.objects (T016-T018, design-tecnico.md Sec1.4).
--              SPEC_DEVIATION (validacao real contra Postgres 17, 1a vez nesta feature que isso
--              acontece -- ver relatorio desta task): descoberto ao testar de verdade que 0019
--              atualizou a policy de SELECT de jornada.fases/jornada.etapas/documentos.documentos
--              para o modelo novo de participacao (crm.meus_casos()), mas NAO a de
--              jornada.jornadas -- ficou presa em "cliente_ve_a_propria_jornada" (cliente_id =
--              crm.meu_cliente_id(), so o vinculo legado). Como
--              "participante_ve_fase_do_caso" (0019) resolve a visibilidade da FASE via um
--              subselect em jornada.jornadas, e esse subselect roda sob a MESMA RLS de
--              jornada.jornadas, nenhum participante do modelo novo (crm.participantes, sem
--              crm.clientes.auth_user_id) conseguia ver NENHUMA fase nem NENHUM documento com
--              fase_id preenchido -- documentos.fase_liberada_para_portal() sempre coalescia para
--              false. Isto quebra silenciosamente a propria promessa de 0019, nao so esta task:
--              corrigido aqui porque arquivos.versoes depende da mesma cadeia (join em
--              documentos.documentos). 0019 permanece imutavel (convencao do projeto);
--              a correcao e um DROP POLICY + CREATE POLICY nesta migration, abaixo.
-- Story: E03-S07
-- Created: 2026-10-11

-- Rollback:
--   DROP POLICY IF EXISTS "participante_ve_jornada_do_caso" ON jornada.jornadas;
--   CREATE POLICY "cliente_ve_a_propria_jornada" ON jornada.jornadas
--     FOR SELECT USING (cliente_id = crm.meu_cliente_id());
--   DROP POLICY IF EXISTS "upload_so_com_reserva_ativa" ON storage.objects;
--   DROP FUNCTION IF EXISTS arquivos.reserva_ativa_para_objeto(text);
--   DELETE FROM storage.buckets WHERE id = 'envios';
--   ALTER TABLE documentos.decisoes_revisao DROP CONSTRAINT IF EXISTS decisoes_revisao_versao_fk;
--   ALTER TABLE crm.contratos DROP CONSTRAINT IF EXISTS contratos_arquivo_versao_fk;
--   DROP TRIGGER IF EXISTS audit_trabalhos_transferencia ON arquivos.trabalhos_transferencia;
--   DROP TRIGGER IF EXISTS audit_reservas_envio ON arquivos.reservas_envio;
--   DROP TRIGGER IF EXISTS audit_versoes ON arquivos.versoes;
--   DROP TRIGGER IF EXISTS audit_vinculos_pasta ON arquivos.vinculos_pasta;
--   DROP TRIGGER IF EXISTS audit_integracoes_microsoft ON arquivos.integracoes_microsoft;
--   DROP TABLE IF EXISTS arquivos.trabalhos_transferencia, arquivos.reservas_envio,
--     arquivos.versoes, arquivos.vinculos_pasta, arquivos.integracoes_microsoft CASCADE;
--   DROP SCHEMA IF EXISTS arquivos;
--   (as policies das cinco tabelas caem junto com o DROP TABLE CASCADE acima -- nao precisam de
--   DROP POLICY explicito)

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- SPEC_DEVIATION / correcao de bug real descoberta ao testar contra Postgres de verdade (ver
-- comentario no topo do arquivo): jornada.jornadas ainda usava a policy de SELECT do modelo
-- mono-titular antigo. Fecha o mesmo buraco que 0019 ja tinha fechado para
-- jornada.fases/jornada.etapas/documentos.documentos -- mesmo predicado
-- (`cliente_id IN (SELECT crm.meus_casos())`), independente do resto desta migration.
-- ─────────────────────────────────────────────────────────────────────────────────────────────

DROP POLICY "cliente_ve_a_propria_jornada" ON jornada.jornadas;

CREATE POLICY "participante_ve_jornada_do_caso" ON jornada.jornadas
  FOR SELECT USING (cliente_id IN (SELECT crm.meus_casos()));

CREATE SCHEMA IF NOT EXISTS arquivos;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- Tabelas (T016) -- ordem: integracoes_microsoft, vinculos_pasta, versoes, reservas_envio,
-- trabalhos_transferencia (design-tecnico.md Sec1.4)
-- ─────────────────────────────────────────────────────────────────────────────────────────────

-- Uma linha ativa por tenant. Refresh token e client secret NAO ficam aqui: Vault, escopo
-- 'microsoft-graph:<id>' (ADR-0019) -- esta tabela so guarda o que identifica a conexao, nunca o
-- segredo que a sustenta.
CREATE TABLE arquivos.integracoes_microsoft (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_email          text NOT NULL,
  tenant_id            text,
  drive_id             text NOT NULL,
  pasta_raiz_item_id   text NOT NULL,          -- pasta corporativa autorizada; ancestral obrigatorio
  escopos              text[] NOT NULL,
  estado               text NOT NULL CHECK (estado IN ('conectada', 'expirada', 'revogada')),
  conectado_por         uuid NOT NULL,
  conectado_em          timestamptz NOT NULL DEFAULT now()
);

-- Pasta do caso no drive corporativo. `caminho_exibicao` e so exibicao -- autorizacao nunca
-- depende de comparar string de caminho, so do `folder_item_id` validado.
CREATE TABLE arquivos.vinculos_pasta (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id         uuid NOT NULL REFERENCES crm.clientes(id),
  jornada_id         uuid REFERENCES jornada.jornadas(id),
  integracao_id      uuid NOT NULL REFERENCES arquivos.integracoes_microsoft(id),
  drive_id           text NOT NULL,
  folder_item_id     text NOT NULL,
  caminho_exibicao   text,                     -- exibicao; nunca autorizacao por string
  validado_por       uuid NOT NULL,
  validado_em        timestamptz NOT NULL,
  estado             text NOT NULL DEFAULT 'ativo' CHECK (estado IN ('ativo', 'bloqueado')),
  CONSTRAINT vinculo_caso_unico UNIQUE (cliente_id, jornada_id)
);

-- Cada arquivo recebido. `versao_destino_unico` garante que a versao pertence a exatamente um
-- destino de negocio (documento, pagamento OU contrato nunca mais de um nem nenhum) --
-- `crm.contratos` e `documentos.decisoes_revisao` fecham suas FKs pendentes para esta tabela no
-- fim deste arquivo.
CREATE TABLE arquivos.versoes (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id              uuid NOT NULL REFERENCES crm.clientes(id),
  documento_id            uuid REFERENCES documentos.documentos(id),
  pagamento_id            uuid REFERENCES pagamentos.pagamentos(id),
  contrato_id             uuid REFERENCES crm.contratos(id),
  numero_versao           integer NOT NULL,
  nome_original           text NOT NULL,
  mime                    text NOT NULL CHECK (mime = 'application/pdf'),  -- MVP: so PDF
  tamanho_bytes           bigint NOT NULL CHECK (tamanho_bytes > 0 AND tamanho_bytes <= 20000000),
  hash_sha256             text,
  objeto_temporario       text,                -- caminho no bucket 'envios'
  drive_id                text,
  item_id                 text,                -- destino final
  estado_recebimento      text NOT NULL CHECK (estado_recebimento IN ('reservada', 'recebida', 'rejeitada')),
  estado_armazenamento    text NOT NULL DEFAULT 'pendente'
    CHECK (estado_armazenamento IN ('pendente', 'transferindo', 'armazenado', 'falhou')),
  enviado_por             uuid NOT NULL,       -- auth.uid() de quem enviou (participante ou admin)
  participante_id         uuid REFERENCES crm.participantes(id),
  recebido_em             timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT versao_destino_unico CHECK (
    (documento_id IS NOT NULL)::int + (pagamento_id IS NOT NULL)::int + (contrato_id IS NOT NULL)::int = 1
  ),
  CONSTRAINT versao_documento_unica UNIQUE (documento_id, numero_versao)
);

-- Autorizacao de upload de curta duracao ao bucket `envios`. `idempotency_key` evita reserva
-- duplicada no retry do mesmo comando; `expira_em` (criada_em + 24h) e o que a policy de INSERT
-- de storage.objects verifica.
CREATE TABLE arquivos.reservas_envio (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id           uuid NOT NULL UNIQUE REFERENCES arquivos.versoes(id),
  objeto_permitido    text NOT NULL,
  tamanho_declarado   bigint NOT NULL,
  mime_declarado      text NOT NULL,
  idempotency_key     text NOT NULL UNIQUE,
  expira_em           timestamptz NOT NULL,     -- criada_em + 24h
  criada_por          uuid NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Fila do processador que move o arquivo do bucket `envios` para o OneDrive.
-- `sessao_referencia` e so o ESCOPO do segredo no Vault (processador:arquivos), nunca o segredo
-- em si nem a URL assinada -- ver comentario abaixo do CREATE TRIGGER desta tabela sobre por que
-- isso ainda pode seguir o trigger de auditoria generico.
CREATE TABLE arquivos.trabalhos_transferencia (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_id               uuid NOT NULL UNIQUE REFERENCES arquivos.versoes(id),
  estado                  text NOT NULL DEFAULT 'pendente'
    CHECK (estado IN ('pendente', 'em_execucao', 'concluido', 'bloqueado')),
  tentativas              integer NOT NULL DEFAULT 0,
  proxima_tentativa_em    timestamptz NOT NULL DEFAULT now(),
  lease_ate               timestamptz,
  lease_dono              text,
  bytes_enviados          bigint NOT NULL DEFAULT 0,
  sessao_referencia       text,                -- escopo do segredo no Vault, nunca a URL
  item_id_resultado       text,
  erro_sanitizado         text,                -- mensagem legivel, sem token nem URL
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX arquivos_vinculos_pasta_cliente_idx ON arquivos.vinculos_pasta (cliente_id);
CREATE INDEX arquivos_versoes_cliente_idx ON arquivos.versoes (cliente_id);
CREATE INDEX arquivos_versoes_documento_idx ON arquivos.versoes (documento_id) WHERE documento_id IS NOT NULL;
CREATE INDEX arquivos_versoes_pagamento_idx ON arquivos.versoes (pagamento_id) WHERE pagamento_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- RLS, GRANT e auditoria (T016)
-- ─────────────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE arquivos.integracoes_microsoft ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos.integracoes_microsoft FORCE ROW LEVEL SECURITY;
ALTER TABLE arquivos.vinculos_pasta ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos.vinculos_pasta FORCE ROW LEVEL SECURITY;
ALTER TABLE arquivos.versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos.versoes FORCE ROW LEVEL SECURITY;
ALTER TABLE arquivos.reservas_envio ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos.reservas_envio FORCE ROW LEVEL SECURITY;
ALTER TABLE arquivos.trabalhos_transferencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos.trabalhos_transferencia FORCE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA arquivos TO authenticated, service_role;

-- integracoes_microsoft, reservas_envio e trabalhos_transferencia sao admin-only -- dado tecnico
-- nunca vai ao portal. Mesmo padrao de crm.contratos (0017, SPEC_DEVIATION la documentada) e
-- crm.notas_internas (0019): GRANT SELECT (nao INSERT/UPDATE/DELETE) a `authenticated` + policy
-- de SELECT so para admin, zero policy de participante -- sem o GRANT, o Postgres nega por
-- privilegio de tabela ANTES de a RLS avaliar, para admin e participante igualmente, o que
-- quebraria "admin le tudo" e trocaria "participante recebe []" por erro de privilegio.
GRANT SELECT ON arquivos.integracoes_microsoft TO authenticated;
GRANT SELECT ON arquivos.reservas_envio TO authenticated;
GRANT SELECT ON arquivos.trabalhos_transferencia TO authenticated;

-- vinculos_pasta: participante precisa saber que existe uma pasta vinculada ao proprio caso
-- (nao usa o conteudo para nada no portal, so a existencia/estado) -- GRANT SELECT a
-- `authenticated` igual as demais, policy de participante abaixo decide o recorte por caso.
GRANT SELECT ON arquivos.vinculos_pasta TO authenticated;

-- versoes: participante le a versao que o seu papel alcanca (documento) ou do seu caso
-- (pagamento) -- GRANT SELECT a `authenticated`, policies abaixo decidem o recorte.
GRANT SELECT ON arquivos.versoes TO authenticated;

-- INSERT/UPDATE/DELETE ficam fora do GRANT a `authenticated` nas cinco tabelas (mesmo criterio
-- de crm.contratos em 0017): escrita (conectar integracao, validar vinculo, registrar
-- versao/reserva/trabalho) e acao de service_role via Edge Function, ainda nao implementada
-- nesta task -- por isso so ha policy de SELECT abaixo, nenhuma de INSERT/UPDATE/DELETE.
GRANT ALL ON arquivos.integracoes_microsoft, arquivos.vinculos_pasta, arquivos.versoes,
  arquivos.reservas_envio, arquivos.trabalhos_transferencia TO service_role;

-- ── arquivos.integracoes_microsoft ──────────────────────────────────────────────────────────
CREATE POLICY "admin_ve_todas_integracoes_microsoft" ON arquivos.integracoes_microsoft
  FOR SELECT USING (crm.e_admin());

-- ── arquivos.vinculos_pasta ──────────────────────────────────────────────────────────────────
CREATE POLICY "admin_ve_todos_vinculos_pasta" ON arquivos.vinculos_pasta
  FOR SELECT USING (crm.e_admin());

-- LIMITACAO: `folder_item_id`/`drive_id` ficam visiveis ao participante do caso, junto com o
-- resto da linha -- RLS do Postgres nao faz column-level masking (mesma limitacao ja registrada
-- para `crm.participantes.email` em 0017). Participante nao usa esses campos no portal, so
-- precisa saber que a pasta existe e o `estado` dela; esconder a coluna por si exigiria view
-- dedicada, trabalho futuro (ver tasks.md "Decisoes de implementacao").
CREATE POLICY "participante_ve_vinculo_do_proprio_caso" ON arquivos.vinculos_pasta
  FOR SELECT USING (cliente_id IN (SELECT crm.meus_casos()));

-- ── arquivos.versoes ─────────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_ve_todas_versoes" ON arquivos.versoes
  FOR SELECT USING (crm.e_admin());

-- Participante le a versao de um documento que o seu papel alcanca (mesmo predicado de
-- "participante_ve_documento_do_caso_no_seu_papel", 0019, via join em documento_id) OU de um
-- pagamento do proprio caso. `contrato_id` nao entra em nenhum ramo de propósito: contrato e
-- admin-only (crm.contratos, 0017) -- o terceiro destino possivel de versao_destino_unico nunca
-- libera leitura a participante.
CREATE POLICY "participante_ve_versao_do_caso_no_seu_papel" ON arquivos.versoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documentos.documentos d
      WHERE d.id = versoes.documento_id
        AND d.cliente_id IN (SELECT crm.meus_casos())
        AND (
          d.restrito_ao_papel = false
          OR d.papel_dirigido IS NULL
          OR crm.tenho_papel(d.cliente_id, d.papel_dirigido)
        )
        AND (d.fase_id IS NULL OR documentos.fase_liberada_para_portal(d.fase_id))
    )
    OR EXISTS (
      SELECT 1 FROM pagamentos.pagamentos p
      WHERE p.id = versoes.pagamento_id
        AND p.cliente_id IN (SELECT crm.meus_casos())
    )
  );

-- ── arquivos.reservas_envio / arquivos.trabalhos_transferencia: admin-only ──────────────────
CREATE POLICY "admin_ve_todas_reservas_envio" ON arquivos.reservas_envio
  FOR SELECT USING (crm.e_admin());

CREATE POLICY "admin_ve_todos_trabalhos_transferencia" ON arquivos.trabalhos_transferencia
  FOR SELECT USING (crm.e_admin());

-- Trigger de auditoria (padrao de 0008) nas cinco tabelas. `arquivos.trabalhos_transferencia`
-- NAO fica fora do trigger generico -- ele audita a LINHA inteira, inclusive `sessao_referencia`,
-- mas isso e o ESCOPO/referencia do segredo no Vault (processador:arquivos), nao o segredo em si
-- nem a URL assinada: auditar essa referencia e esperado (prova quem/quando iniciou a
-- transferencia); o que nunca pode acontecer -- e que este trigger generico tambem nao faz -- e
-- guardar o token/URL real em claro em qualquer lugar fora do Vault.
CREATE TRIGGER audit_integracoes_microsoft AFTER INSERT OR UPDATE OR DELETE ON arquivos.integracoes_microsoft
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_vinculos_pasta AFTER INSERT OR UPDATE OR DELETE ON arquivos.vinculos_pasta
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_versoes AFTER INSERT OR UPDATE OR DELETE ON arquivos.versoes
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_reservas_envio AFTER INSERT OR UPDATE OR DELETE ON arquivos.reservas_envio
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_trabalhos_transferencia AFTER INSERT OR UPDATE OR DELETE ON arquivos.trabalhos_transferencia
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- Bucket `envios` + policy de storage.objects (T017)
-- ─────────────────────────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('envios', 'envios', false, 20000000, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- `storage.objects` ja vem com RLS habilitada pelo proprio Supabase -- esta migration so
-- ADICIONA uma policy, nunca faz ENABLE/FORCE ROW LEVEL SECURITY nela (ver CONCERN no relatorio
-- desta task sobre o quao confiavel e essa premissa no ambiente real vs. no shim de teste).
--
-- SPEC_DEVIATION (validacao real contra Postgres 17, ver CONCERN no relatorio desta task):
-- o brief pedia o predicado de INSERT como um EXISTS inline contra arquivos.reservas_envio,
-- igual ao que esta abaixo so que sem a funcao SECURITY DEFINER. Testado de verdade, esse EXISTS
-- INLINE sempre dava falso para qualquer participante: arquivos.reservas_envio e admin-only
-- (T016, zero policy de SELECT para participante) -- e o EXISTS de uma policy de OUTRA tabela
-- roda com o privilegio de quem faz o INSERT (authenticated), logo sujeito a ESSA MESMA RLS.
-- Participante nunca veria nem a PROPRIA reserva, e o upload de arquivo (funcionalidade central
-- da feature) nunca funcionaria para ninguem alem de admin. Mesmo padrao ja aceito no projeto
-- para romper esse exato tipo de autorreferencia (crm._minhas_participacoes_ativas(), ADR-0020,
-- 0017): uma funcao SECURITY DEFINER de uma linha, sem GRANT a PUBLIC, que devolve so um
-- boolean (nunca uma linha) e trava a leitura em `criada_por = auth.uid()` -- nao concede
-- privilegio novo alem do que a propria policy ja pretendia liberar.
CREATE FUNCTION arquivos.reserva_ativa_para_objeto(p_nome_objeto text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = arquivos, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM arquivos.reservas_envio r
    JOIN arquivos.versoes v ON v.id = r.versao_id
    WHERE r.objeto_permitido = p_nome_objeto
      AND r.expira_em > now()
      AND r.criada_por = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION arquivos.reserva_ativa_para_objeto(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION arquivos.reserva_ativa_para_objeto(text) TO authenticated;

-- INSERT permitido so quando existe reserva NAO expirada cujo `objeto_permitido` bate com o
-- `name` do objeto e cujo `criada_por = auth.uid()` (via a funcao acima). O JOIN em
-- `arquivos.versoes`, dentro da funcao, prova que a reserva aponta para uma versao real mas nao
-- filtra por `cliente_id`/caso de proposito: quem autoriza o UPLOAD a decidir "este usuario pode
-- enviar PARA este caso" e a Edge Function que CRIA a reserva (service_role, fora desta
-- migration) -- `criada_por = auth.uid()` aqui so prova que quem faz o INSERT no bucket e a
-- MESMA pessoa para quem aquela reserva foi emitida, nao reautoriza o caso de novo. A superficie
-- de risco real e a Edge Function de reserva, nao esta policy.
--
-- Nenhuma policy de SELECT/UPDATE/DELETE para `authenticated` neste bucket: download e pela
-- Edge Function `arquivo-baixar`; limpeza e do processador com `service_role`. Ausencia de
-- policy = negado por padrao sob RLS (nao precisa ser "FORCE" para isso valer -- authenticated
-- nao e dono da tabela nem tem BYPASSRLS).
--
-- O proprio setup do Supabase Storage ja concede privilegio de tabela amplo a `authenticated`
-- em `storage.objects` (fora de supabase/migrations/, que so cobre os schemas de negocio deste
-- repositorio) -- mas esta e a PRIMEIRA migration deste repo a tocar o schema `storage`, e o
-- gate `lint:migrations` so conhece texto deste diretorio. Sem um GRANT explicito aqui ele
-- reprova com "CREATE POLICY sem GRANT correspondente", ainda que a policy funcione de verdade
-- em produção. O GRANT abaixo documenta esse estado real (nao concede privilegio alem do que o
-- Supabase Storage ja concede por padrao) e destrava o gate.
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT INSERT ON storage.objects TO authenticated;

CREATE POLICY "upload_so_com_reserva_ativa" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'envios'
    AND arquivos.reserva_ativa_para_objeto(storage.objects.name)
  );

-- service_role nao precisa de policy nova: acesso total ao Storage por padrao no Supabase.

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- FK pendentes (T016) -- fecham o que 0017/0019 deixaram em aberto apontando para esta tabela.
-- NOT VALID pelo mesmo motivo de 0019: as tabelas de origem (crm.contratos,
-- documentos.decisoes_revisao) ja existem desde migrations anteriores e podem ja ter linhas em
-- producao quando esta migration aplicar; validar de cara exigiria scan + lock nas duas tabelas.
-- ─────────────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE crm.contratos
  ADD CONSTRAINT contratos_arquivo_versao_fk FOREIGN KEY (arquivo_versao_id)
    REFERENCES arquivos.versoes(id) NOT VALID;

ALTER TABLE documentos.decisoes_revisao
  ADD CONSTRAINT decisoes_revisao_versao_fk FOREIGN KEY (versao_id)
    REFERENCES arquivos.versoes(id) NOT VALID;
