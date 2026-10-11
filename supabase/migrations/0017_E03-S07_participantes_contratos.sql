-- Description: Base da E03-S07 (Cliente 360 operacional, ADR-0018): modelo de participantes por
--              papel (quem acessa um caso e com que papel) e a origem contratual do cadastro.
--              crm.organizacoes e crm.participantes substituem, ao longo da feature, o vinculo
--              mono-titular antigo (crm.clientes.auth_user_id) por um modelo onde varias pessoas
--              (aplicante, beneficiario, organizacao, familiar de apoio) podem acessar o mesmo
--              caso com papeis distintos. crm.contratos/crm.contrato_condicoes guardam de onde
--              nasce cada cobranca (substituem a hipotese antiga de cobranca solta sem origem).
-- Story: E03-S07
-- Created: 2026-10-11

-- Rollback: DROP TRIGGER IF EXISTS audit_participantes ON crm.participantes;
--           DROP TRIGGER IF EXISTS audit_contrato_condicoes ON crm.contrato_condicoes;
--           DROP TRIGGER IF EXISTS audit_contratos ON crm.contratos;
--           DROP TRIGGER IF EXISTS audit_organizacoes ON crm.organizacoes;
--           DROP FUNCTION IF EXISTS crm.participo_do_caso(uuid);
--           DROP FUNCTION IF EXISTS crm.tenho_papel(uuid, text);
--           DROP FUNCTION IF EXISTS crm.meus_papeis(uuid);
--           DROP FUNCTION IF EXISTS crm.meus_casos();
--           DROP FUNCTION IF EXISTS crm._minhas_participacoes_ativas();  -- ver ADR-0020
--           DROP FUNCTION IF EXISTS crm.e_admin();
--           DROP TABLE IF EXISTS crm.participantes, crm.contrato_condicoes, crm.contratos,
--             crm.organizacoes CASCADE;
--           (as policies, incluindo "participante_ve_a_propria_linha" e
--           "participante_ve_participantes_do_caso", caem junto com o DROP TABLE CASCADE acima
--           -- nao precisam de DROP POLICY explicito)

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- Tabelas (T008) — ordem: organizacoes, contratos, contrato_condicoes, participantes
-- (design-tecnico.md §1.1)
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE crm.organizacoes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  text NOT NULL,
  identificador_fiscal  text,                    -- EIN/CNPJ quando houver
  contato_email         text,
  contato_telefone      text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE crm.contratos (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id                 uuid NOT NULL REFERENCES crm.clientes(id),
  programa_id                text NOT NULL,
  programa_versao            text NOT NULL,
  assinado_em                date,
  prazo_resposta_dias_uteis  integer NOT NULL CHECK (prazo_resposta_dias_uteis BETWEEN 1 AND 60),
  prioridade                 text NOT NULL DEFAULT 'padrao' CHECK (prioridade IN ('padrao', 'prioritaria')),
  observacao                 text,
  -- FK adicionada em 0020_E03-S07_arquivos_onedrive.sql (arquivos.versoes)
  arquivo_versao_id          uuid,
  registrado_por             uuid NOT NULL,      -- auth.uid() do admin
  registrado_em              timestamptz NOT NULL DEFAULT now(),
  substitui_contrato_id      uuid REFERENCES crm.contratos(id),  -- alteracao cria registro novo
  ativo                      boolean NOT NULL DEFAULT true
);

CREATE TABLE crm.contrato_condicoes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id   uuid NOT NULL REFERENCES crm.contratos(id) ON DELETE CASCADE,
  descricao     text NOT NULL,
  tipo          text NOT NULL CHECK (tipo IN ('entrada', 'parcela', 'taxa_federal', 'outro')),
  valor         numeric(12, 2) NOT NULL CHECK (valor > 0),
  moeda         text NOT NULL CHECK (moeda IN ('BRL', 'USD')),
  vencimento    date NOT NULL,
  ordem         integer NOT NULL
);

CREATE TABLE crm.participantes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        uuid NOT NULL REFERENCES crm.clientes(id),
  papel             text NOT NULL
    CHECK (papel IN ('aplicante', 'beneficiario', 'organizacao_aplicante', 'familiar_apoio')),
  sujeito_tipo      text NOT NULL CHECK (sujeito_tipo IN ('titular', 'familiar', 'organizacao')),
  familiar_id       text,              -- id estavel dentro de crm.clientes.perfil_imigratorio
  organizacao_id    uuid REFERENCES crm.organizacoes(id),
  nome_exibicao     text NOT NULL,
  email             text,
  auth_user_id      uuid,              -- null = participante sem acesso ao portal
  estado            text NOT NULL DEFAULT 'ativo' CHECK (estado IN ('ativo', 'revogado')),
  convidado_por     uuid,
  convidado_em      timestamptz,
  revogado_por      uuid,
  revogado_em       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT participante_sujeito_coerente CHECK (
    (sujeito_tipo = 'organizacao' AND organizacao_id IS NOT NULL AND familiar_id IS NULL)
    OR (sujeito_tipo = 'familiar' AND familiar_id IS NOT NULL AND organizacao_id IS NULL)
    OR (sujeito_tipo = 'titular' AND familiar_id IS NULL AND organizacao_id IS NULL)
  ),
  CONSTRAINT participante_auth_unico UNIQUE (auth_user_id, cliente_id)
);

COMMENT ON TABLE crm.participantes IS
  'E03-S07/ADR-0018: quem acessa um caso (crm.clientes) e com que papel. Substitui o vinculo '
  'mono-titular (crm.clientes.auth_user_id) ao longo da feature; crm.meus_casos() cobre os dois '
  'modelos durante a migracao (UNION temporario, ver T009).';

CREATE INDEX crm_participantes_auth_ativo_idx ON crm.participantes (auth_user_id) WHERE estado = 'ativo';
CREATE INDEX crm_participantes_cliente_idx ON crm.participantes (cliente_id);
CREATE INDEX crm_contratos_cliente_ativo_idx ON crm.contratos (cliente_id) WHERE ativo;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- Helpers de RLS por papel (T009) — sem SECURITY DEFINER, mesmo criterio de crm.meu_cliente_id()
-- (0003): rodam com o privilegio de quem chama; a RLS das tabelas consultadas decide o que a
-- funcao enxerga. Nao sao concessao de privilegio novo, so encapsulam uma leitura que o
-- chamador ja podia fazer.
-- ─────────────────────────────────────────────────────────────────────────────────────────────

CREATE FUNCTION crm.e_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role' = 'admin';
$$;

-- ADR-0020: exececao pontual ao "sem SECURITY DEFINER" acima. crm.meus_casos() precisa ler
-- "minhas participacoes ativas" em crm.participantes, e crm.participantes tem a policy
-- "participante_ve_participantes_do_caso" que chama crm.participo_do_caso() -> crm.meus_casos()
-- de volta -- autorreferencia estrutural de RLS ("infinite recursion detected in policy for
-- relation participantes"), que o Postgres detecta na fase de rewrite/planejamento, nao em tempo
-- de execucao -- uma policy direta no "OR" (participante_ve_a_propria_linha, mais abaixo) nao e
-- garantia suficiente de que essa expansao estrutural nunca dispare. Por isso a leitura de
-- crm.participantes sai daqui e vai para este helper interno, SECURITY DEFINER, mesmo padrao ja
-- aceito no projeto em audit.registrar_mudanca() (0008). Nao concede privilegio novo: o
-- WHERE auth_user_id = auth.uid() trava o resultado ao proprio chamador, sem parametro vindo de
-- fora. Nunca GRANT a authenticated diretamente -- so crm.meus_casos() chama.
CREATE FUNCTION crm._minhas_participacoes_ativas()
RETURNS setof uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = crm, pg_temp
AS $$
  SELECT cliente_id FROM crm.participantes
  WHERE auth_user_id = auth.uid() AND estado = 'ativo';
$$;

-- Dentro de uma funcao SECURITY DEFINER cujo dono tem BYPASSRLS, a consulta acima NAO reentra na
-- RLS de crm.participantes -- rompe o ciclo de forma estrutural, nao por ordem de avaliacao de
-- OR. crm.meus_casos() continua sem SECURITY DEFINER (so delega a parte perigosa).
CREATE FUNCTION crm.meus_casos()
RETURNS setof uuid
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM crm._minhas_participacoes_ativas()
  UNION
  -- Vinculo legado mono-titular (crm.clientes.auth_user_id) -- continua valendo durante a
  -- migracao. Remover este UNION e tarefa de migration futura (0024), fora deste escopo.
  SELECT crm.meu_cliente_id() WHERE crm.meu_cliente_id() IS NOT NULL;
$$;

CREATE FUNCTION crm.meus_papeis(p_cliente_id uuid)
RETURNS setof text
LANGUAGE sql
STABLE
AS $$
  SELECT papel FROM crm.participantes
  WHERE cliente_id = p_cliente_id AND auth_user_id = auth.uid() AND estado = 'ativo';
$$;

CREATE FUNCTION crm.tenho_papel(p_cliente_id uuid, p_papel text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_papel IN (SELECT crm.meus_papeis(p_cliente_id));
$$;

CREATE FUNCTION crm.participo_do_caso(p_cliente_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_cliente_id IN (SELECT crm.meus_casos());
$$;

-- crm._minhas_participacoes_ativas() nao e chamada diretamente por ninguem fora deste arquivo --
-- so por crm.meus_casos(), definida mais acima. Mas crm.meus_casos() NAO e SECURITY DEFINER: ela
-- roda com o privilegio de quem a chamou (authenticated), entao o Postgres checa EXECUTE em
-- crm._minhas_participacoes_ativas() contra essa MESMA role (authenticated), nao contra a role
-- que criou a funcao. O GRANT explicito abaixo e o que torna esse acesso deliberado, no mesmo
-- padrao de toda SECURITY DEFINER chamavel deste repositorio (REVOKE ALL FROM PUBLIC primeiro,
-- GRANT EXECUTE depois so para a role que precisa — ver 0016, configuracoes.salvar_segredo_
-- integracao/crm.obter_cliente_por_telefone): sem o REVOKE, o Postgres concede EXECUTE a PUBLIC
-- por padrao na criacao da funcao, entao a fronteira real dependeria de um privilegio implicito,
-- nao de um GRANT visivel aqui. O GRANT nao abre acesso novo alem do que PUBLIC ja teria por
-- padrao: o corpo da funcao so devolve linhas do proprio auth.uid(), exatamente o que a policy
-- "participante_ve_a_propria_linha" tambem permite.
REVOKE ALL ON FUNCTION crm._minhas_participacoes_ativas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crm._minhas_participacoes_ativas() TO authenticated;

GRANT EXECUTE ON FUNCTION crm.e_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION crm.meus_casos() TO authenticated;
GRANT EXECUTE ON FUNCTION crm.meus_papeis(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.tenho_papel(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.participo_do_caso(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- RLS, GRANT e auditoria (T010)
-- ─────────────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE crm.organizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.organizacoes FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.contratos FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.contrato_condicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.contrato_condicoes FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.participantes FORCE ROW LEVEL SECURITY;

-- GRANT USAGE ON SCHEMA crm TO authenticated / TO service_role ja existem (0001/0002) --
-- confirmado com `grep -rn "GRANT USAGE ON SCHEMA crm" supabase/migrations/` antes de repetir.

-- crm.organizacoes e crm.participantes: leitura liberada a authenticated, RLS decide o recorte.
GRANT SELECT ON crm.organizacoes TO authenticated;
GRANT SELECT ON crm.participantes TO authenticated;

-- SPEC_DEVIATION (registrado em tasks.md "Decisoes de implementacao"): o brief desta task pedia
-- "contrato e condicoes sao admin-only, sem GRANT a authenticated". Sem NENHUM GRANT, a role
-- `authenticated` nao tem privilegio de tabela -- o Postgres nega com erro
-- (insufficient_privilege) ANTES de a RLS ser avaliada, para admin e participante igualmente.
-- Isso quebra dois requisitos explicitos do T011 na MESMA brief: (1) "admin le todas as linhas
-- de ... crm.contratos" (precisa de privilegio de tabela pra role authenticated, que e a role
-- real do Postgres por tras do claim admin do JWT) e (2) "participante NAO le ... retorna vazio,
-- nao erro" (vazio exige que a query rode e a RLS filtre pra zero linhas; erro de privilegio nao
-- e "vazio"). O mesmo padrao ja existe no repo para tabela admin-only (crm.leads, 0011):
-- GRANT SELECT concedido a authenticated, zero policy de cliente, cliente recebe [] em vez de
-- erro. Resolvido aqui do mesmo jeito: GRANT SELECT (nao INSERT/UPDATE/DELETE) a authenticated,
-- policy de SELECT so para admin, zero policy de participante.
GRANT SELECT ON crm.contratos TO authenticated;
GRANT SELECT ON crm.contrato_condicoes TO authenticated;

-- INSERT/UPDATE/DELETE ficam fora do GRANT a authenticated nas 4 tabelas (mesmo criterio de
-- crm.clientes em 0001): sem GRANT = sem acesso; escrita (criar contrato, convidar/revogar
-- participante, cadastrar organizacao) e acao de service_role via Edge Function ainda nao
-- implementada (fora de escopo T008-T011) -- por isso nao ha policy de INSERT/UPDATE/DELETE
-- abaixo, so de SELECT.

GRANT ALL ON crm.organizacoes, crm.contratos, crm.contrato_condicoes, crm.participantes TO service_role;

-- ── crm.organizacoes ────────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_ve_todas_organizacoes" ON crm.organizacoes
  FOR SELECT USING (crm.e_admin());

-- Depende da correcao de ADR-0020: crm.participo_do_caso() chama crm.meus_casos(), que agora
-- resolve a leitura de crm.participantes via o helper SECURITY DEFINER
-- crm._minhas_participacoes_ativas() em vez de consultar crm.participantes direto -- esta
-- policy herda a correcao automaticamente, sem mudanca propria.
CREATE POLICY "participante_ve_organizacao_do_caso" ON crm.organizacoes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crm.participantes p
      WHERE p.organizacao_id = organizacoes.id
        AND crm.participo_do_caso(p.cliente_id)
    )
  );

-- ── crm.participantes ───────────────────────────────────────────────────────────────────────
CREATE POLICY "admin_ve_todos_participantes" ON crm.participantes
  FOR SELECT USING (crm.e_admin());

-- Exigencia propria do desenho: participante sempre ve a propria linha. Deixou de ser o
-- mecanismo que rompe a autorreferencia de RLS (ver ADR-0020 -- isso agora e papel do helper
-- SECURITY DEFINER crm._minhas_participacoes_ativas(), acionado por crm.meus_casos()); esta
-- policy continua como defesa em profundidade: participante ve a propria linha mesmo num cenario
-- onde crm.participo_do_caso() nao alcancasse por algum motivo.
CREATE POLICY "participante_ve_a_propria_linha" ON crm.participantes
  FOR SELECT USING (auth_user_id = auth.uid());

-- LIMITACAO: e-mail do participante visivel aos demais participantes do caso (nome e papel sao
-- publicos dentro do caso por design, mas o Postgres RLS nao faz column-level masking -- nao e
-- possivel esconder so a coluna email por omissao de SELECT parcial). Mascarar email por view
-- dedicada e trabalho futuro, registrado em tasks.md "Decisoes de implementacao".
CREATE POLICY "participante_ve_participantes_do_caso" ON crm.participantes
  FOR SELECT USING (crm.participo_do_caso(cliente_id));

-- ── crm.contratos / crm.contrato_condicoes: admin-only, zero policy de participante ──────────
-- (ver SPEC_DEVIATION acima sobre o GRANT). Participante autenticado consultando qualquer uma
-- das duas recebe [], nao erro -- nao vaza nem a existencia da tabela (mesmo padrao de
-- crm.leads, 0011).
CREATE POLICY "admin_ve_todos_contratos" ON crm.contratos
  FOR SELECT USING (crm.e_admin());

CREATE POLICY "admin_ve_todas_condicoes_contrato" ON crm.contrato_condicoes
  FOR SELECT USING (crm.e_admin());

-- Trigger de auditoria (padrao de 0008) nas 4 tabelas novas.
CREATE TRIGGER audit_organizacoes AFTER INSERT OR UPDATE OR DELETE ON crm.organizacoes
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_contratos AFTER INSERT OR UPDATE OR DELETE ON crm.contratos
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_contrato_condicoes AFTER INSERT OR UPDATE OR DELETE ON crm.contrato_condicoes
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
CREATE TRIGGER audit_participantes AFTER INSERT OR UPDATE OR DELETE ON crm.participantes
  FOR EACH ROW EXECUTE FUNCTION audit.registrar_mudanca();
