---
name: design-tecnico-E03-S07
description: Nomes concretos de schema, tabela, coluna, policy, função SQL, Edge Function, bucket, estado e arquivo de tela da E03-S07. Puxe ao implementar ou revisar a feature Cliente 360 operacional.
alwaysApply: false
---

# Design técnico — E03-S07 Cliente 360 operacional

**Story**: E03-S07 · **Data**: 2026-10-11 · **Autoria**: `@architect` + `@data-engineer`
**Base**: [spec.md](spec.md) · [plan.md](plan.md) · [data-model.md](data-model.md) ·
[contracts/operacoes.md](contracts/operacoes.md) · ADR-0018 · ADR-0019

Este documento fixa **nomes**. `spec.md` diz o que o produto faz; aqui está como as coisas se
chamam, para que a implementação não invente identificador novo a cada arquivo. Divergir daqui é
`SPEC_DEVIATION` e vai anotado em `tasks.md`.

Convenções do repositório que valem sem exceção:

- SQL em `snake_case` PT-BR; TypeScript em `camelCase` PT-BR; sem abreviação inventada.
- Migration: `NNNN_E03-S07_descricao.sql`, sequência sem pular, com `-- Description:`,
  `-- Story:`, `-- Created:` e `-- Rollback:` no topo (ver `0016`).
- Adapter de leitura: `Supabase<Coisa>Consulta.ts` + `.test.ts` ao lado.
- Tela com dado real: `<Coisa>RealPage.tsx`. Tela mock antiga permanece intocada.
- Toda tabela nova: `ENABLE` + `FORCE ROW LEVEL SECURITY`, `GRANT` explícito, trigger de auditoria.
- **Escrita de estado protegido não passa por PostgREST.** Leitura usa RLS; mutação usa Edge
  Function com `service_role`, depois de autorizar na própria função.

---

## 1. Migrations

Última migration existente: `0016_E13-S12_integracao_evolution_openrouter.sql`. Esta feature usa **0017 a 0024**. Nenhuma renumera nem reescreve migration anterior.

### 1.1 `0017_E03-S07_participantes_contratos.sql`

Papéis e contrato. Base de tudo (ADR-0018).

```
crm.organizacoes
  id uuid pk default gen_random_uuid()
  nome text not null
  identificador_fiscal text                 -- EIN/CNPJ quando houver
  contato_email text
  contato_telefone text
  created_at/updated_at timestamptz not null default now()

crm.contratos
  id uuid pk
  cliente_id uuid not null references crm.clientes(id)
  programa_id text not null
  programa_versao text not null
  assinado_em date
  prazo_resposta_dias_uteis integer not null check (prazo_resposta_dias_uteis between 1 and 60)
  prioridade text not null default 'padrao' check (prioridade in ('padrao','prioritaria'))
  observacao text
  arquivo_versao_id uuid                    -- FK adicionada em 0020 (arquivos.versoes)
  registrado_por uuid not null              -- auth.uid() do admin
  registrado_em timestamptz not null default now()
  substitui_contrato_id uuid references crm.contratos(id)   -- alteração cria registro novo
  ativo boolean not null default true

crm.contrato_condicoes                      -- de onde nasce cada cobrança
  id uuid pk
  contrato_id uuid not null references crm.contratos(id) on delete cascade
  descricao text not null
  tipo text not null check (tipo in ('entrada','parcela','taxa_federal','outro'))
  valor numeric(12,2) not null check (valor > 0)
  moeda text not null check (moeda in ('BRL','USD'))
  vencimento date not null
  ordem integer not null

crm.participantes
  id uuid pk
  cliente_id uuid not null references crm.clientes(id)
  papel text not null check (papel in ('aplicante','beneficiario','organizacao_aplicante','familiar_apoio'))
  sujeito_tipo text not null check (sujeito_tipo in ('titular','familiar','organizacao'))
  familiar_id text                          -- id estável dentro de crm.clientes.perfil_imigratorio
  organizacao_id uuid references crm.organizacoes(id)
  nome_exibicao text not null
  email text
  auth_user_id uuid                         -- null = participante sem acesso ao portal
  estado text not null default 'ativo' check (estado in ('ativo','revogado'))
  convidado_por uuid
  convidado_em timestamptz
  revogado_por uuid
  revogado_em timestamptz
  created_at/updated_at timestamptz not null default now()
  constraint participante_sujeito_coerente check (
    (sujeito_tipo = 'organizacao' and organizacao_id is not null and familiar_id is null)
    or (sujeito_tipo = 'familiar' and familiar_id is not null and organizacao_id is null)
    or (sujeito_tipo = 'titular' and familiar_id is null and organizacao_id is null))
  constraint participante_auth_unico unique (auth_user_id, cliente_id)
```

Índices: `crm_participantes_auth_ativo_idx` em `(auth_user_id) where estado = 'ativo'`;
`crm_participantes_cliente_idx` em `(cliente_id)`; `crm_contratos_cliente_ativo_idx` em
`(cliente_id) where ativo`.

Helpers — **sem `SECURITY DEFINER`**, mesmo critério de `crm.meu_cliente_id()` (0003):

```sql
crm.e_admin() returns boolean                -- auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
crm.meus_casos() returns setof uuid          -- cliente_id de participação ativa do auth.uid()
crm.meus_papeis(p_cliente_id uuid) returns setof text
crm.tenho_papel(p_cliente_id uuid, p_papel text) returns boolean
crm.participo_do_caso(p_cliente_id uuid) returns boolean
```

`crm.meus_casos()` **também** cobre o vínculo legado: `UNION` com `crm.meu_cliente_id()` enquanto a
migração do titular antigo não termina. A remoção desse `UNION` é tarefa desta feature (T-final),
não dívida para depois.

RLS: admin lê/escreve tudo; participante lê a própria linha de `crm.participantes` e as dos demais
participantes do **mesmo** caso (nome e papel são públicos dentro do caso, e-mail não — expor
e-mail só para admin, via coluna omitida na view do portal). `crm.contratos` e
`crm.contrato_condicoes` são **admin-only** (zero policy de participante). `crm.organizacoes`:
admin escreve; participante lê a organização que participa do seu caso.

Auditoria: aplicar o trigger genérico de `0008` nas 4 tabelas novas.

### 1.2 `0018_E03-S07_A-02_revoga_update_do_cliente.sql`

Fecha **A-02**. Hoje `0003`/`0005` dão `UPDATE` a `authenticated` com predicado só de propriedade —
o cliente pode mudar `status` de documento, `valor` de pagamento e etapa direto pelo PostgREST.

```
DROP POLICY "cliente_atualiza_o_proprio_documento" ON documentos.documentos;
DROP POLICY "cliente_atualiza_o_proprio_pagamento" ON pagamentos.pagamentos;
-- idem para as policies de UPDATE de cliente em jornada.jornadas/fases/etapas (ver 0003)
REVOKE UPDATE ON documentos.documentos FROM authenticated;
REVOKE UPDATE ON pagamentos.pagamentos FROM authenticated;
REVOKE UPDATE ON jornada.jornadas, jornada.fases, jornada.etapas FROM authenticated;
```

`SELECT` continua. Toda escrita passa pelas Edge Functions da seção 2. Policies de `UPDATE` de
admin **também** caem: admin escreve pelo comando, para que a auditoria e a revisão otimista
existam sempre. Nada aqui apaga dado.

### 1.3 `0019_E03-S07_jornada_documentos_por_papel.sql`

**Correção em 2026-10-11**: esta migration também cria a tabela genérica de idempotência que
faltava no desenho original — nenhuma migration anterior (0017/0018) a previa, e `_shared/
idempotencia.ts` (§2) precisa de algum lugar para gravar. Entra aqui, no início do arquivo, antes
das alterações de jornada/documentos (são independentes entre si):

```sql
CREATE SCHEMA IF NOT EXISTS comandos;

-- Generico para toda Edge Function de comando desta feature que exige idempotencyKey (§2).
-- Só service_role acessa (zero GRANT a authenticated, zero policy) -- e um comando client-side
-- nunca consulta isto diretamente, so o handler do servidor.
CREATE TABLE comandos.idempotencia (
  chave          text PRIMARY KEY,
  hash_conteudo  text NOT NULL,
  resultado      jsonb NOT NULL,
  criado_por     uuid NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comandos.idempotencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE comandos.idempotencia FORCE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA comandos TO service_role;
GRANT ALL ON comandos.idempotencia TO service_role;
-- Sem GRANT a authenticated, sem policy: RLS FORCE + zero privilegio de tabela nega tudo.
-- service_role tem BYPASSRLS por padrao no Supabase, FORCE nao o alcanca (mesmo criterio de
-- audit.eventos, 0008).
```

Chave sugerida pelas Edge Functions: `sha256(nome_da_acao + ":" + idempotencyKey_do_cliente)` —
nunca o `idempotencyKey` bruto do cliente como chave primária sozinho, para não colidir entre
ações diferentes. `hash_conteudo` é o hash do corpo normalizado da requisição (detecta "mesma
chave, conteúdo diferente" → 409). `resultado` é o corpo de resposta original, devolvido sem
reprocessar.

```
jornada.jornadas  + contrato_id uuid references crm.contratos(id)
                  + levantamento_estado text not null default 'incompleto'
                      check (levantamento_estado in ('incompleto','conferido'))
                  + conferido_por uuid, conferido_em timestamptz
                  + origem_situacao_inicial text        -- 'importado' | 'nascido_na_plataforma'
                  + revisao integer not null default 1  -- lock otimista
jornada.fases     + revisao integer not null default 1
jornada.etapas    + prazo_em date
                  + revisao integer not null default 1

documentos.documentos
  + jornada_id uuid references jornada.jornadas(id)
  + sujeito_tipo text not null default 'caso' check (sujeito_tipo in ('caso','participante','familiar'))
  + sujeito_participante_id uuid references crm.participantes(id)
  + sujeito_familiar_id text
  + papel_dirigido text check (papel_dirigido in ('aplicante','beneficiario','organizacao_aplicante','familiar_apoio'))
  + envio_conjunto boolean not null default false
  + restrito_ao_papel boolean not null default false
  + prazo_em date
  + instrucao text
  + revisao integer not null default 1
  constraint documento_sujeito_coerente  -- espelha o CHECK de participantes

documentos.decisoes_revisao               -- append-only, nunca UPDATE/DELETE
  id uuid pk
  documento_id uuid not null references documentos.documentos(id)
  versao_id uuid not null                 -- FK para arquivos.versoes, criada em 0020
  decisao text not null check (decisao in ('aprovado','ajustes'))
  justificativa text                      -- obrigatória quando decisao = 'ajustes' (CHECK)
  decidido_por uuid not null
  decidido_em timestamptz not null default now()

crm.notas_internas                        -- admin-only, nunca no DTO do portal
  id uuid pk
  cliente_id uuid not null references crm.clientes(id)
  conteudo text not null
  autor_id uuid not null
  created_at timestamptz not null default now()
```

RLS de `documentos.documentos` passa a ser (substitui as policies de 0005):

```sql
CREATE POLICY "admin_ve_todos_documentos" ... USING (crm.e_admin());
CREATE POLICY "participante_ve_documento_do_caso_no_seu_papel" ON documentos.documentos
  FOR SELECT USING (
    cliente_id IN (SELECT crm.meus_casos())
    AND (
      restrito_ao_papel = false
      OR papel_dirigido IS NULL
      OR crm.tenho_papel(cliente_id, papel_dirigido)
    )
    AND documentos.fase_liberada_para_portal(fase_id)   -- FR-021
  );
```

`documentos.fase_liberada_para_portal(p_fase_id uuid)` retorna `true` para fase
`liberada`/`em_andamento`/`concluida` e `false` para `bloqueada` e para `NULL` quando a jornada tem
fases. Documento sem fase (ex.: contrato) é visível ao papel a que se dirige.

`jornada.fases`/`etapas` ganham policy análoga: participante lê fase do seu caso, e as **etapas**
só de fase liberada.

### 1.4 `0020_E03-S07_arquivos_onedrive.sql`

Schema `arquivos`: infraestrutura compartilhada por `documentos` e `pagamentos` (ADR-0019).

```
arquivos.integracoes_microsoft          -- uma linha ativa por tenant; admin-only
  id uuid pk
  conta_email text not null
  tenant_id text
  drive_id text not null
  pasta_raiz_item_id text not null      -- pasta corporativa autorizada; ancestral obrigatório
  escopos text[] not null
  estado text not null check (estado in ('conectada','expirada','revogada'))
  conectado_por uuid not null, conectado_em timestamptz not null default now()
  -- refresh token e client secret NÃO ficam aqui: Vault, escopo 'microsoft-graph:<id>'

arquivos.vinculos_pasta                 -- pasta do caso
  id uuid pk
  cliente_id uuid not null references crm.clientes(id)
  jornada_id uuid references jornada.jornadas(id)
  integracao_id uuid not null references arquivos.integracoes_microsoft(id)
  drive_id text not null
  folder_item_id text not null
  caminho_exibicao text                 -- exibição; nunca autorização por string
  validado_por uuid not null, validado_em timestamptz not null
  estado text not null default 'ativo' check (estado in ('ativo','bloqueado'))
  constraint vinculo_caso_unico unique (cliente_id, jornada_id)

arquivos.versoes
  id uuid pk
  cliente_id uuid not null references crm.clientes(id)
  documento_id uuid references documentos.documentos(id)
  pagamento_id uuid references pagamentos.pagamentos(id)
  contrato_id uuid references crm.contratos(id)
  numero_versao integer not null
  nome_original text not null
  mime text not null check (mime = 'application/pdf')      -- MVP: só PDF
  tamanho_bytes bigint not null check (tamanho_bytes > 0 and tamanho_bytes <= 20000000)
  hash_sha256 text
  objeto_temporario text                -- caminho no bucket 'envios'
  drive_id text, item_id text           -- destino final
  estado_recebimento text not null check (estado_recebimento in ('reservada','recebida','rejeitada'))
  estado_armazenamento text not null default 'pendente'
      check (estado_armazenamento in ('pendente','transferindo','armazenado','falhou'))
  enviado_por uuid not null             -- auth.uid() de quem enviou (participante ou admin)
  participante_id uuid references crm.participantes(id)
  recebido_em timestamptz
  created_at timestamptz not null default now()
  constraint versao_destino_unico check (
    (documento_id is not null)::int + (pagamento_id is not null)::int + (contrato_id is not null)::int = 1)
  constraint versao_documento_unica unique (documento_id, numero_versao)

arquivos.reservas_envio
  id uuid pk
  versao_id uuid not null unique references arquivos.versoes(id)
  objeto_permitido text not null
  tamanho_declarado bigint not null
  mime_declarado text not null
  idempotency_key text not null unique
  expira_em timestamptz not null        -- criada_em + 24h
  criada_por uuid not null
  created_at timestamptz not null default now()

arquivos.trabalhos_transferencia
  id uuid pk
  versao_id uuid not null unique references arquivos.versoes(id)
  estado text not null default 'pendente'
      check (estado in ('pendente','em_execucao','concluido','bloqueado'))
  tentativas integer not null default 0
  proxima_tentativa_em timestamptz not null default now()
  lease_ate timestamptz
  lease_dono text
  bytes_enviados bigint not null default 0
  sessao_referencia text                -- escopo do segredo no Vault, nunca a URL
  item_id_resultado text
  erro_sanitizado text                  -- mensagem legível, sem token nem URL
  created_at/updated_at timestamptz not null default now()
```

Bucket: `envios`, **privado**, limite 20000000 bytes, `allowed_mime_types = {application/pdf}`.
Policies de `storage.objects` para `authenticated`:

- `INSERT` permitido só quando existe reserva **não expirada** cujo `objeto_permitido = name`, cuja
  versão pertence a caso em que o usuário participa (ou admin) e cujo `criada_por = auth.uid()`.
- `SELECT`/`UPDATE`/`DELETE` negados a `authenticated` (download é pela função `arquivo-baixar`;
  limpeza é do processador com `service_role`).

RLS de `arquivos.versoes`: admin tudo; participante lê versão de documento que seu papel alcança
(reusa o mesmo predicado do 1.3) ou de pagamento do seu caso. `reservas_envio`,
`trabalhos_transferencia` e `integracoes_microsoft` são **admin-only** — dado técnico não vai ao
portal. Auditoria nas cinco tabelas; `arquivos.trabalhos_transferencia` fica fora da auditoria de
conteúdo sensível (grava só transições de estado, nunca `sessao_referencia`).

Fecha o `arquivo_versao_id` de `crm.contratos` e o `versao_id` de `documentos.decisoes_revisao` com
`ALTER TABLE ... ADD CONSTRAINT` ao fim do arquivo.

### 1.5 `0021_E03-S07_pagamentos_contrato.sql`

```
pagamentos.pagamentos
  + contrato_condicao_id uuid references crm.contrato_condicoes(id)
  + comprovante_versao_id uuid references arquivos.versoes(id)
  + motivo_divergencia text
  + confirmado_por_id uuid                 -- novo; `confirmado_por text` legado permanece
  + revisao integer not null default 1
```

`comprovante_url` legado permanece para leitura do histórico e **não** recebe valor novo.
Policy de `SELECT` do participante passa a `cliente_id IN (SELECT crm.meus_casos())`.

### 1.6 `0022_E03-S07_cron_transferencia.sql`

Agenda `arquivos-processar` a cada minuto (`pg_cron`), chamando `arquivo-processar` com o segredo
`processador:arquivos` do Vault. Inclui `arquivos.liberar_leases_expiradas()` (lease vencido volta
para `pendente`) e `arquivos.limpar_temporarios_confirmados()` (remove objeto de versão com
`estado_armazenamento = 'armazenado'`). Reserva expirada e não finalizada é apagada junto; **versão
`recebida` com transferência pendente nunca é limpa**.

### 1.7 `0023_E03-S07_projecoes.sql`

Funções de leitura, `STABLE`, usadas **igualmente** pelo detalhe e pela carteira (FR-012). Sem
`SECURITY DEFINER`: a RLS de quem chama decide o que elas veem.

```sql
jornada.progresso_caso(p_cliente_id uuid)
  returns table (percentual numeric, requisitos_total int, requisitos_concluidos int,
                 etapas_total int, etapas_concluidas int, criterio text, calculado_em timestamptz)
  -- levantamento_estado = 'incompleto' → percentual NULL e criterio = 'cadastro_incompleto'

jornada.previsao_protocolo(p_cliente_id uuid)
  returns table (data_estimada date, motivo_sem_previsao text, entregas_consideradas int,
                 ritmo_dias_por_requisito numeric, calculado_em timestamptz)
  -- < 3 entregas aprovadas → data_estimada NULL, motivo 'historico_insuficiente'
  -- soma os dias de análise da Akros (crm.contratos.prazo_resposta_dias_uteis) por requisito restante
  -- NUNCA estima decisão do USCIS: o retorno não tem campo para isso

crm.resumo_caso(p_cliente_id uuid)
  returns table (fase_atual text, proxima_acao text, responsavel text,
                 pendencias_cliente int, pendencias_akros int, pendencias_terceiro int,
                 documentos_faltantes int, documentos_em_revisao int, documentos_em_ajustes int,
                 pagamentos_vencidos int, pagamentos_em_conferencia int,
                 levantamento_estado text, atualizado_em timestamptz)

crm.carteira_casos(p_busca text, p_programa text, p_fase text, p_responsavel text,
                   p_tipo_pendencia text, p_prazo_ate date, p_cursor uuid, p_limite int)
  returns table (... uma linha por caso ..., total_por_criterio jsonb, atualizado_em timestamptz)
  -- p_limite default 50, máximo 50; cursor por (updated_at, id)
  -- totais por critério são completos, não da página
```

Regras que as funções devem obedecer, idênticas em todo lugar: **faltante** = requisito obrigatório
aplicável sem versão aprovada; `aguardando_akros` inclui envio aguardando revisão;
`aguardando_cliente` inclui ajuste solicitado; vencimentos próximos = **7 dias corridos**; moedas
nunca somadas; ausência de dado nunca vira zero nem "em dia".

---

## 2. Edge Functions

Seis funções. Toda função: CORS restrito → JWT → papel → Zod `strict` → rate limit declarado
(gate `check:edge-functions`) → lógica → RFC 7807. Entrada é **união discriminada** por `acao`.
Nenhuma aceita `clienteId` do participante como fonte de autoridade: o caso vem da participação.

**Correção em 2026-10-11 — padrão porta/adapter também nas Edge Functions.** O repositório já
estabelece isso para webhook/agente (`_shared/webhook.ts` declara a porta `IOWebhook`;
`_shared/io-supabase.ts` é o adapter real com `service_role`; os testes injetam um fake — nenhum
teste de `_shared/*.test.ts` toca banco real). Toda lógica nova desta feature segue o mesmo
desenho, não `createClient()` chamado direto de dentro da função de autorização/comando:

- **`requireAdmin(req)` e `requireServiceRole(req)` já existem** em `_shared/auth.ts` (checam
  `app_metadata.role` do usuário validado pelo Auth, e comparação em tempo constante contra as
  chaves privilegiadas do projeto, respectivamente) — **reusar**, não recriar. `onedrive-oauth`
  usa `requireAdmin`; `arquivo-processar` usa `requireServiceRole` com o segredo do Cron.
  `_shared/autorizacao-caso.ts` só precisa do que é genuinamente novo: `resolverParticipacao` e
  `exigirPapel`, que declaram a porta de dados `IOAutorizacaoCaso` — hoje uma leitura:
  `participacoesDoUsuario(authUserId): Promise<{ clienteId: string; papel: Papel | null }[]>`.
  **Correção em 2026-10-11 (revisão adversarial)**: a regra NÃO é a mesma de
  `crm.meus_casos()`/`crm.meus_papeis()` — é a de `crm.meus_casos()` **sozinha**
  (linhas ativas de `crm.participantes` + o vínculo legado `crm.clientes.auth_user_id`, este
  último com `papel: null`). `crm.meus_papeis()`/`crm.tenho_papel()` deliberadamente **não** têm
  fallback para o vínculo legado — ele participa do caso (por isso aparece na lista, e leituras
  do tipo "qual é o meu caso" continuam funcionando), mas não tem papel reconhecido, então
  `exigirPapel` nunca autoriza uma ação restrita a papel para ele. Não sintetize papel (ex.:
  `"aplicante"`) para o vínculo legado: isso autorizaria, no Edge Function com `service_role` (sem
  RLS por trás), uma ação que a leitura via RLS depois recusaria mostrar.
- `_shared/io-supabase-caso.ts` é o adapter real (`service_role`) dessa porta, nome próprio porque
  `io-supabase.ts` já tem responsabilidade única (IO do webhook/agente) — não acumule autorização
  de caso nele.
- Comandos com estado próprio (`caso-comandos`, `revisao-comandos`, `envio-comandos`) crescem o
  mesmo padrão: a lógica de cada `acao` recebe sua porta de E/S (pode reaproveitar/estender
  `io-supabase-caso.ts`), o `index.ts` de cada função só monta o adapter real e despacha por
  `acao`. Os testes Deno de cada função usam um fake, nunca Postgres real.

| Função | Quem | Ações |
|---|---|---|
| `caso-comandos` | admin | `registrar_contrato`, `preparar_caso`, `convidar_participante`, `revogar_participante`, `solicitar_documento`, `vincular_pasta`, `registrar_nota`, `cadastrar_cobranca` |
| `revisao-comandos` | admin | `revisar_documento`, `decidir_etapa`, `liberar_fase`, `conciliar_pagamento`, `reprocessar_arquivo` |
| `envio-comandos` | participante ou admin | `reservar_envio`, `finalizar_envio`, `enviar_etapa_para_avaliacao` |
| `arquivo-baixar` | participante ou admin | `GET ?versaoId=` → attachment |
| `arquivo-processar` | interno (Cron + segredo) | adquire lease, transfere, reconcilia |
| `onedrive-oauth` | admin | `GET /iniciar`, `GET /callback` (state + PKCE) |

Regras transversais:

- **Idempotência**: `registrar_contrato`, `cadastrar_cobranca`, `finalizar_envio`, `revisar_documento`,
  `decidir_etapa`, `liberar_fase` e `conciliar_pagamento` exigem `idempotencyKey`. Mesma chave e
  mesmo conteúdo devolvem o resultado anterior; mesma chave com conteúdo diferente → **409**.
- **Revisão otimista**: todo comando de transição recebe `revisaoEsperada`; divergência → **409**
  com a revisão atual, sem gravar.
- **Transação única** por comando: estado + evento de histórico + (quando aplicável) trabalho de
  transferência. Nada de dois `update` soltos.
- **Auditoria**: a função grava com `service_role`, então registra explicitamente `autor_id` da
  requisição (e identidade do sistema no processador) — não finge que `auth.uid()` é o autor.
- **Erros**: 401 sessão; 403 papel sem autoridade; **404** para requisito restrito a outro papel e
  tarefa de fase não liberada (403 confirmaria existência); 409 revisão/idempotência/vínculo; 413
  acima de 20000000 bytes; 422 Zod ou papel fora do programa; 429 rate limit.

### 2.1 `envio-comandos` — o fluxo que mais erra

`reservar_envio` → `{ solicitacaoId | pagamentoId, nomeArquivo, tamanhoBytes, mime }`
Valida: participação ativa; papel dirigido ou `envio_conjunto`; fase liberada; sujeito do caso;
tamanho ≤ 20000000; `mime = application/pdf`. Cria `arquivos.versoes` (`reservada`) +
`arquivos.reservas_envio` com `objeto_permitido = <clienteId>/<versaoId>.pdf` e `expira_em = now() + 24h`.
Retorna `{ versaoId, objetoPermitido, expiraEm }`. **Não** retorna URL assinada: o browser escreve
no bucket com a própria sessão (TUS acima de 6 MB).

`finalizar_envio` → `{ versaoId, idempotencyKey, revisaoEsperada }`
Verifica objeto no Storage (existe, tamanho igual ao declarado, MIME PDF por assinatura `%PDF-`
lida do início do arquivo, não pela extensão), reserva não expirada e vínculo. Em **uma transação**:
versão → `recebida` com `recebido_em`; documento → `enviado`; cria
`arquivos.trabalhos_transferencia` (`pendente`). Só então responde
`{ versaoId, recebidoEm, estadoArmazenamento: "pendente" }`. Repetir com a mesma chave devolve o
mesmo resultado e **não** cria segunda versão.

`enviar_etapa_para_avaliacao` → `{ etapaId, revisaoEsperada }`: `pendente → em_analise`. Não
conclui etapa nem libera fase (E09-S05).

### 2.2 `arquivo-processar` — transferência

1. `SELECT ... FOR UPDATE SKIP LOCKED` em `trabalhos_transferencia` com `estado = 'pendente'` e
   `proxima_tentativa_em <= now()`; grava `lease_ate = now() + 5 min` e `lease_dono`.
2. Obtém token: refresh do Vault (`microsoft-graph:<integracaoId>`), troca por access token.
3. Valida que `vinculos_pasta.folder_item_id` é descendente de `pasta_raiz_item_id` — **sempre**,
   não só na vinculação.
4. Cria sessão de upload do Graph (`createUploadSession`), guarda o segredo no Vault com escopo
   `upload-sessao:<versaoId>` e só a **referência** no banco.
5. Envia fragmentos de **5 MiB** (múltiplo de 320 KiB), atualizando `bytes_enviados` a cada
   fragmento confirmado.
6. Conclui: grava `item_id`, `estado_armazenamento = 'armazenado'`, trabalho `concluido`, descarta o
   segredo da sessão. Nome no OneDrive: `<requisito|cobranca>-<versaoId>.pdf` (determinístico).
7. **Resposta perdida**: antes de reenviar, procura o item determinístico na pasta; se existir com
   o tamanho esperado, reconcilia em vez de enviar de novo.
8. Falha: `tentativas += 1`, backoff `min(2^tentativas minutos, 60 min)` respeitando `Retry-After`;
   401/403 → `bloqueado` com motivo "reconectar conta Microsoft"; quota ou pasta ausente →
   `bloqueado` com motivo legível. Nunca marca `armazenado` sem confirmação do item.

---

## 3. Frontend

Regra de dependência: `interfaces → application → domain ← infrastructure`; features não se
importam entre si — o que cruza domínio vai para `apps/web/src/shared/contracts/`.

| Camada | Arquivo | Conteúdo |
|---|---|---|
| shared | `shared/contracts/caso.ts` | `PapelParticipante`, `SujeitoDocumento`, `EstadoRecebimento`, `EstadoArmazenamento`, DTO de resumo do caso |
| shared | `shared/contracts/arquivo.ts` | porta `EnvioArquivoPort` (reservar/escrever/finalizar/consultar) |
| shared | `shared/supabase/envio-tus.ts` | upload retomável no bucket `envios` |
| crm | `crm/domain/participante.ts` | tipos de participante/papel e regra "papel não aprova" |
| crm | `crm/domain/contrato.ts` | contrato, condições, prioridade |
| crm | `crm/application/useContratoComandos.ts`, `useParticipantesComandos.ts`, `useCarteiraSupabase.ts` | casos de uso |
| crm | `crm/infrastructure/SupabaseCasoComandos.ts`, `SupabaseCarteiraConsulta.ts` | adapters (+ `.test.ts`) |
| crm | `crm/interfaces/ContratoFormulario.tsx`, `ParticipantesPainel.tsx`, `CarteiraRealPage.tsx` | telas novas |
| crm | `crm/interfaces/Clientes360RealPage.tsx` | ganha participantes, contrato, pendências e próxima ação; sai o aviso de somente-leitura da linha 310 |
| documentos | `documentos/application/useEnvioDocumento.ts`, `useRevisaoComandos.ts` | envio e revisão |
| documentos | `documentos/infrastructure/SupabaseEnvioComandos.ts`, `SupabaseVersoesConsulta.ts` | adapters |
| documentos | `documentos/interfaces/DocumentosRealPage.tsx`, `FilaRevisaoRealPage.tsx` | upload real, versões, devolução com motivo |
| jornada | `jornada/application/useJornadaComandos.ts`, `usePrevisaoProtocolo.ts` | etapa/fase e previsão |
| jornada | `jornada/interfaces/JornadaRealPage.tsx` | fase seguinte oculta, percentual, estimativa de protocolo |
| pagamentos | `pagamentos/application/usePagamentoComandos.ts` | cobrança, comprovante, conciliação |
| pagamentos | `pagamentos/interfaces/PagamentosRealPage.tsx`, `ConciliacaoRealPage.tsx` | portal e conciliação |
| configuracoes | `configuracoes/interfaces/ConfiguracoesRealPage.tsx` | cartão "Conta Microsoft / OneDrive": conectar, conta, pasta, estado; **nunca** segredo |

Registro no container: `apps/web/src/app/real-repositories.ts` e `di.ts` — adapter, hooks e tela na
**mesma** entrega, nunca `di.ts` sozinho (regra fixa de E13-S11).

i18n: **correção em 2026-10-11** — o repositório usa só 4 namespaces (`common`, `site`, `portal`,
`admin`; ver `shared/i18n/index.ts`), com chaves agrupadas por seção dentro de cada arquivo (ex.:
`journey.*`, `dashboard.*` em `portal.json`). Não criar `caso.json`/`envio.json` novos. Esta
feature adiciona seções novas em `portal.json`/`admin.json` (pt-BR e en): `admin.json` ganha
`case.*` (contrato, participantes, papéis, prioridade), `participants.*`; `portal.json` ganha
`upload.*` (estados de recebimento/armazenamento, erro de envio), `progress.*` (percentual,
estimativa de protocolo). Zero texto hardcoded; o texto da estimativa diz **protocolo**, nunca
decisão do USCIS.

---

## 4. Estados e transições

```
Documento   pendente → enviado → em_analise → aprovado
                          ↑          ↓
                          └──────  ajustes            (motivo obrigatório)
Versão      reservada → recebida | rejeitada
Armazenam.  pendente → transferindo → armazenado | falhou
Etapa       pendente → em_analise → concluida        (cliente só faz a 1ª flecha)
Fase        bloqueada → liberada → em_andamento → concluida   (só equipe libera)
Pagamento   pendente|atrasado → em_conferencia → pago | divergente
Trabalho    pendente → em_execucao → concluido | bloqueado
```

Invariantes a provar por teste: cliente não executa `em_analise → concluida`, `aprovado` nem
`liberada`; comprovante não leva a `pago`; versão nova invalida a aprovação anterior como prova do
requisito **sem** apagar a decisão antiga; `armazenado` exige `item_id` confirmado.

---

## 5. Testes — onde cada prova mora

| Tipo | Arquivos | Prova |
|---|---|---|
| Domínio/regras (Vitest) | `*/domain/*.test.ts`, `jornada/application/calcular-previsao.test.ts` | faltante, pendências, percentual, previsão, moeda separada |
| Adapters (Vitest) | `*/infrastructure/Supabase*.test.ts` | mapeamento, JSONB/numeric de borda, lacuna ≠ zero |
| Telas (Vitest + RTL) | `*/interfaces/*.smoke.test.tsx` | fase seguinte oculta, estados distintos, sem nota interna |
| Edge Functions (Deno) | `supabase/functions/_shared/*.test.ts`, `supabase/functions/<fn>/*.test.ts` | Zod, papel, idempotência, 409, 404 de restrito, reconciliação |
| SQL (pgTAP/psql) | `supabase/tests/06-rls-participantes_test.sql`, `07-rls-documentos-papel_test.sql`, `08-rls-arquivos_test.sql`, `09-a02-sem-update-do-cliente_test.sql`, `10-projecoes-carteira_test.sql` | isolamento por caso **e por papel**, revogação, `UPDATE` negado com releitura, totais |
| E2E (Playwright) | `apps/web/e2e/cliente-360-operacional.spec.ts`, `papel-visibilidade.spec.ts` | convite, envio, revisão, conciliação, carteira, leitura cruzada |

Comandos (sempre com `rtk`): `rtk pnpm run ci:local`, `rtk pnpm run arch:check`,
`rtk pnpm run test:functions`, `rtk pnpm run lint:migrations`, `rtk pnpm e2e`.
Teste SQL negativo **relê a linha** depois do `UPDATE` bloqueado — `204` sozinho não prova nada.

---

## 6. Limites fixados

| Limite | Valor | Onde vale |
|---|---|---|
| Tamanho de PDF | 20000000 bytes | bucket, `CHECK`, Zod, UI antes do envio |
| Tipo aceito | `application/pdf` (assinatura `%PDF-`) | bucket, `finalizar_envio` |
| Reserva não finalizada | expira em 24 h | `reservas_envio.expira_em`, limpeza |
| Fragmento do Graph | 5 MiB (múltiplo de 320 KiB) | `arquivo-processar` |
| Lease do trabalho | 5 min | `trabalhos_transferencia.lease_ate` |
| Backoff | `min(2^tentativas min, 60 min)`, respeita `Retry-After` | processador |
| Página da carteira | 50 casos, cursor | `crm.carteira_casos` |
| Vencimento próximo | 7 dias corridos | projeções |
| Prazo de resposta | 1 a 60 dias úteis, do contrato | `crm.contratos` |

Nenhum desses valores entra em código solto: constantes em
`apps/web/src/shared/contracts/arquivo.ts` e `supabase/functions/_shared/limites.ts`.

---

## 7. Sequência das migrations

`0017` participantes e contratos · `0018` fim do UPDATE direto (A-02) · `0019` jornada e documentos
por papel · `0020` schema `arquivos` e bucket · `0021` pagamentos ligados ao contrato ·
`0022` cron de transferência e limpeza · `0023` projeções de resumo, carteira, progresso e previsão ·
`0024` remoção do vínculo legado em `crm.meus_casos()`. A ordem é a de `tasks.md`; a sequência nunca
pula número.
