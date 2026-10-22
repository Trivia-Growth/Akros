---
name: tasks-E03-S07
description: Tarefas executáveis da E03-S07 Cliente 360 operacional, por user story, com caminhos de arquivo, gates e rollout para o Bruno usar. Puxe ao implementar a feature.
alwaysApply: false
---

# Tasks: Cliente 360 operacional

**Story**: E03-S07 · **Gerado em**: 2026-10-11
**Input**: [spec.md](spec.md) · [plan.md](plan.md) · [design-tecnico.md](design-tecnico.md) ·
[data-model.md](data-model.md) · [contracts/operacoes.md](contracts/operacoes.md) ·
[research.md](research.md) · [quickstart.md](quickstart.md) · ADR-0018 · ADR-0019

**Formato**: `- [ ] [ID] [P?] [Story?] descrição com caminho de arquivo`
`[P]` = pode rodar em paralelo (arquivos distintos, sem dependência pendente).

## Como executar (leia antes da T001)

1. **Nomes vêm do `design-tecnico.md`.** Tabela, coluna, policy, função, bucket, arquivo de tela:
   tudo nomeado lá. Precisou de nome que não está lá? Decida, anote no fim deste arquivo em
   **Decisões de implementação** e siga. Divergiu do que está lá? `// SPEC_DEVIATION: <motivo>` no
   código e linha nova na mesma seção.
2. **Teste antes do código** nos comportamentos de negócio e de segurança (constituição IV). O
   teste que não falha antes da implementação não prova nada.
3. **Um commit por task**, Conventional Commit com a story no escopo e subject em minúscula:
   `feat(E03-S07): cria tabela de participantes com papel do programa`.
4. **Todo comando de shell com `rtk`**: `rtk pnpm run ci:local`, `rtk pnpm run test:functions`,
   `rtk pnpm run lint:migrations`, `rtk pnpm run arch:check`, `rtk pnpm e2e`.
5. **Não habilite botão sem o caminho seguro completo.** Tela que chama comando inexistente, ou
   comando sem RLS atrás, é regressão, não progresso parcial.
6. `@devops` é o único que faz `git push`, PR e deploy (`AGENTS.md`). A fase 11 é dele.
7. Ao concluir cada fase, marque a saída correspondente em `docs/epics/ROADMAP.md` e atualize
   `docs/STATE.md` (`/handoff`).

---

## Phase 1: Setup (infraestrutura compartilhada)

**Objetivo**: criar o terreno comum sem tocar em comportamento.

- [ ] T001 Criar a branch `feat/E03-S07-cliente-360-operacional` a partir de `origin/main` em worktree própria, conforme `superpowers:using-git-worktrees`
- [ ] T002 [P] Criar `apps/web/src/shared/contracts/caso.ts` com `PapelParticipante` (`aplicante`, `beneficiario`, `organizacao_aplicante`, `familiar_apoio`), `SujeitoDocumento` (`caso`, `participante`, `familiar`), `EstadoRecebimento` (`reservada`, `recebida`, `rejeitada`), `EstadoArmazenamento` (`pendente`, `transferindo`, `armazenado`, `falhou`) e o DTO de resumo do caso
- [ ] T003 [P] Criar `apps/web/src/shared/contracts/arquivo.ts` com a porta `EnvioArquivoPort` e as constantes de limite (`TAMANHO_MAXIMO_BYTES = 20000000`, `MIME_ACEITO = "application/pdf"`, `RESERVA_VALIDADE_HORAS = 24`)
- [ ] T004 [P] Criar `supabase/functions/_shared/limites.ts` espelhando as mesmas constantes de T003 (valores duplicados entre runtimes são intencionais; mantenha-os iguais e cite o outro arquivo em comentário)
- [ ] T005 [P] Adicionar a seção `case.*` em `apps/web/src/shared/i18n/locales/{pt-BR,en}/admin.json` (SPEC_DEVIATION de design-tecnico.md §3: repositório usa 4 namespaces fixos, não arquivo por feature — ver `shared/i18n/index.ts`) com as chaves de contrato, participantes, papel e prioridade contratual
- [ ] T006 [P] Adicionar a seção `upload.*` em `apps/web/src/shared/i18n/locales/{pt-BR,en}/portal.json` com estados de recebimento/armazenamento e mensagens de erro de envio
- [ ] T007 Rodar `rtk pnpm run ci:local` na branch limpa e registrar a saída base em `specs/005-cliente-360-operacional/tasks.md` (seção Decisões de implementação), para distinguir falha nova de falha pré-existente

---

## Phase 2: Foundational (pré-requisitos bloqueantes)

**⚠️ CRÍTICO**: nenhuma user story começa antes desta fase terminar. Aqui mora o fechamento do
A-02 e o predicado de autorização do ADR-0018 — errar aqui vaza documento restrito.

### Banco: papéis, contrato e fim do UPDATE direto

- [ ] T008 Criar `supabase/migrations/0017_E03-S07_participantes_contratos.sql` com `crm.organizacoes`, `crm.contratos`, `crm.contrato_condicoes` e `crm.participantes`, colunas, `CHECK` e índices exatamente como em `design-tecnico.md` §1.1 (inclui `prazo_resposta_dias_uteis between 1 and 60`, `prioridade in ('padrao','prioritaria')`, `valor > 0`, `moeda in ('BRL','USD')` e `participante_sujeito_coerente`)
- [ ] T009 Em `supabase/migrations/0017_E03-S07_participantes_contratos.sql`, criar os helpers `crm.e_admin()`, `crm.meus_casos()`, `crm.meus_papeis(uuid)`, `crm.tenho_papel(uuid, text)` e `crm.participo_do_caso(uuid)` sem `SECURITY DEFINER`, com `GRANT EXECUTE ... TO authenticated`, e `crm.meus_casos()` fazendo `UNION` temporário com `crm.meu_cliente_id()`
- [ ] T010 No mesmo `0017`, aplicar `ENABLE`/`FORCE ROW LEVEL SECURITY`, `GRANT` explícito para `authenticated` e `service_role`, policies de `design-tecnico.md` §1.1 (contrato e condições **admin-only**) e o trigger de auditoria de `0008` nas quatro tabelas
- [ ] T011 Escrever `supabase/tests/06-rls-participantes_test.sql`: admin lê tudo; participante lê os participantes do próprio caso e não lê de outro; contrato e condições retornam vazio para participante; `UPDATE` de participante na própria linha é negado **com releitura** provando que a linha não mudou
- [ ] T012 Criar `supabase/migrations/0018_E03-S07_A-02_revoga_update_do_cliente.sql` removendo as policies de `UPDATE` de cliente e de admin em `documentos.documentos`, `pagamentos.pagamentos`, `jornada.jornadas`, `jornada.fases` e `jornada.etapas`, e revogando `UPDATE` de `authenticated` nessas tabelas (`SELECT` permanece), com `-- Rollback:` que recria as policies anteriores
- [ ] T013 Escrever `supabase/tests/09-a02-sem-update-do-cliente_test.sql` provando que cliente e admin autenticados não alteram `status` de documento, `valor`/`status` de pagamento nem etapa por `UPDATE` direto, sempre com releitura da linha
- [ ] T014 Criar `supabase/migrations/0019_E03-S07_jornada_documentos_por_papel.sql` com, **primeiro**, o schema `comandos` e a tabela `comandos.idempotencia` (admin técnico, só `service_role`, design-tecnico.md §1.3 "Correção em 2026-10-11" — faltava no desenho original e `_shared/idempotencia.ts` do T022 depende dela), e **depois** as colunas novas de `jornada.*` e `documentos.documentos`, as tabelas `documentos.decisoes_revisao` (append-only, `justificativa` obrigatória quando `decisao = 'ajustes'`) e `crm.notas_internas` (admin-only), a função `documentos.fase_liberada_para_portal(uuid)` e as policies de `SELECT` por participação + papel de `design-tecnico.md` §1.3
- [ ] T015 Escrever `supabase/tests/07-rls-documentos-papel_test.sql`: participante vê documento não restrito do seu caso; **não** vê documento `restrito_ao_papel` dirigido a outro papel (nem por `WHERE id =`); não vê etapa de fase `bloqueada`; nota interna retorna vazio; participante revogado perde leitura
- [ ] T016 Criar `supabase/migrations/0020_E03-S07_arquivos_onedrive.sql` com o schema `arquivos`, as cinco tabelas de `design-tecnico.md` §1.4 (incluindo `versao_destino_unico`, `versao_documento_unica`, `tamanho_bytes <= 20000000` e `mime = 'application/pdf'`), RLS/GRANT, auditoria e as duas `FOREIGN KEY` pendentes de `crm.contratos.arquivo_versao_id` e `documentos.decisoes_revisao.versao_id`
- [ ] T017 No mesmo `0020`, criar o bucket privado `envios` (limite 20000000 bytes, `allowed_mime_types = {application/pdf}`) e as policies de `storage.objects`: `INSERT` só com reserva não expirada, objeto igual ao `objeto_permitido`, caso do usuário e `criada_por = auth.uid()`; `SELECT`/`UPDATE`/`DELETE` negados a `authenticated`
- [ ] T018 Escrever `supabase/tests/08-rls-arquivos_test.sql`: reserva/trabalho/integração retornam vazio para participante; versão de documento restrito a outro papel não é lida; `INSERT` no bucket fora da reserva é negado; participante não lê objeto do bucket
- [ ] T019 Criar `supabase/migrations/0021_E03-S07_pagamentos_contrato.sql` com `contrato_condicao_id`, `comprovante_versao_id`, `motivo_divergencia`, `confirmado_por_id` e `revisao` em `pagamentos.pagamentos`, e a policy de `SELECT` por `crm.meus_casos()`
- [ ] T020 Rodar `rtk pnpm run lint:migrations` e aplicar `0017` a `0021` em PostgreSQL 17 limpo pelo fluxo existente de db-tests, com os testes SQL T011/T013/T015/T018 verdes

### Borda: bibliotecas compartilhadas das Edge Functions

- [ ] T021 [P] Criar `supabase/functions/_shared/autorizacao-caso.ts` com `resolverParticipacao(req, { clienteId? })` (deriva caso e papéis da sessão, nunca do body) e `exigirPapel(...)`, no padrão porta/adapter do repositório (porta `IOAutorizacaoCaso` + adapter real em `supabase/functions/_shared/io-supabase-caso.ts`); **reusar** `requireAdmin(req)` e `requireServiceRole(req)` já existentes em `_shared/auth.ts` (SPEC_DEVIATION de design-tecnico.md §2: já existem, não recriar)
- [ ] T022 [P] Criar `supabase/functions/_shared/idempotencia.ts` com registro de `idempotencyKey` por comando, no padrão porta/adapter do repositório (como `_shared/webhook.ts` + `io-supabase.ts`): a lógica recebe uma porta `IOIdempotencia` (`buscar`/`gravar` em `comandos.idempotencia`, criada no T014); mesma chave e mesmo hash de conteúdo devolvem o resultado anterior; conteúdo diferente lança `HttpError(409)`. Adapter real em `supabase/functions/_shared/io-supabase-caso.ts` (ver T021)
- [ ] T023 [P] Criar `supabase/functions/_shared/revisao.ts` com a verificação de `revisaoEsperada` e incremento atômico, lançando `HttpError(409)` com a revisão atual
- [ ] T024 [P] Escrever `supabase/functions/_shared/autorizacao-caso.test.ts`, `idempotencia.test.ts` e `revisao.test.ts` (Deno) cobrindo papel ausente, caso de outro participante, chave repetida com conteúdo diferente e revisão obsoleta
- [ ] T025 **Movida para a fase 10 (T124a)**: as seis Edge Functions desta feature só existem a partir da fase 5 (US2) em diante — não há o que declarar teto em `check:edge-functions` ainda nesta fase. Cada task que cria uma das seis (`T031`, `T054`, `T059`, `T069`, `T073`, `T080`) já inclui "declarar teto via `checarLimite`" na própria descrição; `T124a` roda o gate depois que todas existirem
- [ ] T026 Rodar `rtk pnpm run test:functions` e `rtk pnpm run ci:local`; fase 2 só fecha com os dois verdes — já alcançável agora, as bibliotecas compartilhadas (T021-T024) têm seus próprios testes Deno reais

**Saída da fase 2**: dois casos isolados, dois papéis do mesmo caso isolados, nenhuma escrita de
estado protegido possível pelo PostgREST, e as bibliotecas de autorização/idempotência/revisão
provadas por teste.

---

## Phase 3: US1 — Equipe prepara e acompanha um caso (P1)

**Objetivo (spec US1)**: contrato registrado gera cadastro, papéis, cobranças e prazos; o 360 mostra
fase, responsável, próxima ação e pendências; cadastro incompleto aparece como incompleto.
**Teste independente**: preparar um caso fictício e consultar fase, responsável, próxima ação e
pendências; caso sem contrato aparece como cadastro incompleto.

- [x] T027 [P] [US1] Escrever `apps/web/src/features/crm/domain/contrato.test.ts` cobrindo derivação de cobranças das condições, prioridade `prioritaria`, prazo fora de 1–60 recusado e contrato ausente → cadastro incompleto
- [x] T028 [P] [US1] Escrever `apps/web/src/features/crm/domain/caso.test.ts` cobrindo próxima ação, responsável e a regra "ausência de informação não é ausência de pendência"
- [x] T029 [US1] Criar `apps/web/src/features/crm/domain/contrato.ts` com `Contrato`, `ContratoCondicao`, `Prioridade` e as regras puras de derivação (sem I/O)
- [x] T030 [US1] Criar `apps/web/src/features/crm/domain/caso.ts` com `SituacaoCaso`, `LevantamentoEstado` e o cálculo de próxima ação/responsável
- [x] T031 [US1] Criar `supabase/functions/caso-comandos/index.ts` com a união discriminada por `acao` e as ações `registrar_contrato` e `preparar_caso` (Zod `strict`, `requireAdmin`, idempotência, transação única com evento de histórico), chamando `checarLimite` de `_shared/rate-limit.ts` com teto declarado (E14-S01 AC-6 — gate `check:edge-functions` falha função pública sem isso)
- [x] T032 [US1] Escrever `supabase/functions/caso-comandos/caso-comandos.test.ts` (Deno) cobrindo papel não-admin recusado, Zod inválido → 422, idempotência repetida, condição sem valor → 422 e contrato substituído gerando registro novo sem reescrever cobrança conciliada
- [x] T033 [US1] Criar `apps/web/src/features/crm/infrastructure/SupabaseCasoComandos.ts` chamando `caso-comandos` e mapeando erros RFC 7807 para mensagens i18n
- [x] T034 [P] [US1] Criar `apps/web/src/features/crm/infrastructure/SupabaseCasoComandos.test.ts` cobrindo 409 de idempotência, 403 e 422
- [x] T035 [US1] Criar `apps/web/src/features/crm/application/useContratoComandos.ts` (registrar contrato, preparar caso) consumindo a porta, sem Supabase na camada de aplicação
- [x] T036 [US1] Estender `apps/web/src/features/crm/infrastructure/SupabaseCliente360AdminConsulta.ts` para ler `crm.resumo_caso` quando existir, contrato ativo, levantamento e próxima ação, mantendo o teste existente verde — feito via `contratos`/`contrato_condicoes` + `Jornada.levantamentoEstado` (ver decisão T038); `crm.resumo_caso` não existe ainda (design-tecnico.md §1.6), não bloqueou
- [x] T037 [US1] Criar `apps/web/src/features/crm/interfaces/ContratoFormulario.tsx` (programa/versão, participantes e papéis, condições financeiras, prazo de resposta, prioridade, PDF assinado opcional) seguindo a skill `impeccable` e i18n PT-BR/EN — participantes/papéis e PDF assinado ficaram fora, ver decisão T037
- [x] T038 [US1] Atualizar `apps/web/src/features/crm/interfaces/Clientes360RealPage.tsx` com cabeçalho (programa, fase, responsável, última e próxima ação), fila "O que precisa de atenção", selo de cadastro incompleto e remoção do aviso de somente-leitura
- [x] T039 [US1] Registrar adapter, hooks e telas em `apps/web/src/app/real-repositories.ts` e `apps/web/src/app/di.ts` na mesma entrega
- [x] T040 [US1] Escrever `apps/web/src/features/crm/interfaces/cliente-360-operacional.smoke.test.tsx` provando selo de cadastro incompleto, pendências separadas por tipo e ausência de nota interna no DTO do portal
- [x] T041 [US1] Rodar `rtk pnpm run ci:local` e `rtk pnpm run arch:check`; registrar evidência dos cenários 1 a 6 da US1 em `specs/005-cliente-360-operacional/evidencias/us1.md`
- [ ] T041a [US1] **Gap real encontrado em revisão adversarial, registrado em `evidencias/us1.md` cenário 2**: `crm.preparar_caso` (migration `0022`) grava `origem_situacao_inicial` sempre como `'nascido_na_plataforma'` — não há parâmetro para `'importado'`. Sem isto, US1 cenário 2 ("cliente em andamento... registra situação inicial... origem") não fica provado de ponta a ponta, e **bloqueia considerar a US1 inteira `Converged`** mesmo com T027-T041 aprovados. Adicionar `p_origem text DEFAULT 'nascido_na_plataforma'` à RPC (migration nova, `0024` em diante — `0022` já foi revisada/aprovada, não editar), expor `origem` opcional no Zod de `preparar_caso` (`_shared/caso-comandos.ts`), e um campo simples no `ContratoFormulario`/fluxo de preparo ("Cliente em andamento (histórico importado)" vs. "Caso novo"). Vínculo/preservação de pasta OneDrive fica fora (depende da integração OneDrive, fase 5) — este item é só o parâmetro de origem e seu registro de autor/data, que já existem (`conferido_por`/`conferido_em`)
- [ ] T041b [US1] Estender `apps/web/src/features/crm/infrastructure/SupabaseCliente360AdminConsulta.test.ts` com testes do novo campo `origemSituacaoInicial` depois que T041a existir (segue o mesmo padrão dos testes de `paraContrato` já adicionados nesta fase — ver commit da revisão adversarial)

---

## Phase 4: US6 — Caso com vários participantes e documento restrito (P1)

**Objetivo (spec US6)**: participantes por papel, convite por papel e documento restrito invisível
a outro papel. **Depende de US1** (contrato declara os participantes).
**Teste independente**: caso R com dois participantes, uma solicitação para cada papel, leitura
cruzada do requisito restrito recusada — provada em SQL e pela API, não só na tela.

- [x] T042 [P] [US6] Escrever `apps/web/src/features/crm/domain/participante.test.ts`: papel fora do conjunto do programa recusado, papel não concede autoridade de equipe, participante sem acesso é válido, revogação não afeta os demais
- [x] T043 [US6] Criar `apps/web/src/features/crm/domain/participante.ts` com `Participante`, `PapelParticipante` (de `shared/contracts/caso.ts`) e as regras puras
- [x] T044 [US6] Estender o template de programa em `apps/web/src/features/programas/domain/types.ts` com `papeis` (existentes, obrigatórios), `papelDirigido`, `envioConjunto` e `restrito` por `RequisitoDocumento`, mantendo a versão congelada do caso (ADR-0004/0014)
- [x] T045 [P] [US6] Escrever `apps/web/src/features/programas/domain/papeis.test.ts` provando que alterar o catálogo não muda caso em andamento (congelamento por `programaVersao`)
- [x] T046 [US6] Adicionar as ações `convidar_participante`, `revogar_participante` e `solicitar_documento` em `supabase/functions/caso-comandos/index.ts`, recusando papel fora do programa (422) e copiando `restrito`/`papel_dirigido`/`envio_conjunto` do requisito do programa, nunca do body
- [x] T047 [US6] Integrar o convite com o fluxo de E12-S04 em `supabase/functions/caso-comandos/index.ts`, criando o vínculo por **participante e papel** e registrando quem convidou e quando
- [x] T048 [US6] Estender `supabase/functions/caso-comandos/caso-comandos.test.ts` com: papel inválido 422; convite de participante em caso alheio 403; revogação de um participante não atinge o outro; solicitação com sujeito de outro caso 422
- [x] T049 [US6] Criar `apps/web/src/features/crm/application/useParticipantesComandos.ts` e `apps/web/src/features/crm/infrastructure/SupabaseParticipantesConsulta.ts` (+ `.test.ts`)
- [x] T050 [US6] Criar `apps/web/src/features/crm/interfaces/ParticipantesPainel.tsx` (lista por papel, convidar, revogar, estado do acesso) com i18n e `impeccable`
- [x] T051 [US6] Ajustar `apps/web/src/features/documentos/infrastructure/SupabaseDocumentosConsulta.ts` para que o DTO do portal **não** inclua requisito restrito a outro papel nem contagem dele, e atualizar `SupabaseDocumentosConsulta.test.ts` — **investigado e confirmado sem mudança de código**: RLS (migration 0019) já garante a invariante sozinha; filtro redundante em JavaScript criaria segunda fonte de verdade. Documentado em comentário no arquivo + teste dedicado.
- [x] T052 [US6] Escrever `apps/web/e2e/papel-visibilidade.spec.ts`: dois participantes do mesmo caso, cada um vê só o seu; requisito restrito responde 404 por ID; download recusado; revogado perde upload, download e retomada — **escrito, não executado** (sem `.env.test.local`/fixture neste ambiente; `test.skip` documentado).
- [x] T053 [US6] Rodar os testes SQL T015/T018 outra vez contra o estado real e registrar evidência dos 6 cenários da US6 em `specs/005-cliente-360-operacional/evidencias/us6.md`

---

## Phase 5: US2 — Participante acessa a jornada e envia documento (P1)

**Objetivo (spec US2)**: envio pelo portal com recebimento durável, armazenamento no OneDrive como
estado separado e fase seguinte oculta. **Depende de US1 e US6** e do ADR-0019.
**Teste independente**: participante convidado envia um PDF solicitado; a equipe abre o mesmo
arquivo na pasta do caso, sem acesso a arquivo de outro caso.

### Conexão Microsoft

- [ ] T054 [US2] Criar `supabase/functions/onedrive-oauth/index.ts` com `GET /iniciar` (admin, `state` + PKCE, escopos `Files.ReadWrite offline_access`) e `GET /callback` (valida `state`, troca o código, grava refresh token no Vault com escopo `microsoft-graph:<integracaoId>` e a linha de `arquivos.integracoes_microsoft`), sem jamais devolver token; declarar teto via `checarLimite` (E14-S01 AC-6)
- [ ] T055 [P] [US2] Escrever `supabase/functions/onedrive-oauth/onedrive-oauth.test.ts`: `state` inválido recusado, não-admin 403, resposta sem token, falha na troca não cria integração
- [ ] T056 [US2] Adicionar a ação `vincular_pasta` em `supabase/functions/caso-comandos/index.ts`, validando drive, **ancestralidade** sob `pasta_raiz_item_id`, permissões e unicidade por caso; caminho arbitrário é recusado
- [ ] T057 [P] [US2] Estender `supabase/functions/caso-comandos/caso-comandos.test.ts` com pasta fora da raiz autorizada recusada, pasta já vinculada a outro caso → 409 e pasta inexistente → erro legível
- [ ] T058 [US2] Adicionar o cartão "Conta Microsoft / OneDrive" em `apps/web/src/features/configuracoes/interfaces/ConfiguracoesRealPage.tsx` (conectar, conta, pasta raiz, estado, reconectar), sem exibir segredo, e estender `ConfiguracoesRealPage.test.tsx`

### Envio

- [ ] T059 [US2] Criar `supabase/functions/envio-comandos/index.ts` com `reservar_envio` conforme `design-tecnico.md` §2.1 (valida participação, papel dirigido ou `envio_conjunto`, fase liberada, sujeito do caso, 20000000 bytes, PDF) devolvendo `{ versaoId, objetoPermitido, expiraEm }` e nenhuma URL assinada; declarar teto via `checarLimite` (E14-S01 AC-6)
- [ ] T060 [US2] Implementar `finalizar_envio` em `supabase/functions/envio-comandos/index.ts`: verifica objeto no Storage (existência, tamanho igual ao declarado, assinatura `%PDF-`), reserva válida, e grava em **uma transação** versão `recebida`, documento `enviado` e trabalho de transferência `pendente`
- [ ] T061 [US2] Escrever `supabase/functions/envio-comandos/envio-comandos.test.ts`: fase bloqueada 404; papel sem direito 403; acima do limite 413; arquivo não-PDF 422; finalização repetida com a mesma chave devolve a mesma versão; objeto ausente não confirma recebimento
- [ ] T062 [US2] Criar `apps/web/src/shared/supabase/envio-tus.ts` com upload retomável ao bucket `envios` (TUS acima de 6 MB), progresso e retomada, usando a sessão atual
- [ ] T063 [P] [US2] Criar `apps/web/src/shared/supabase/envio-tus.test.ts` cobrindo interrupção e retomada sem duplicar objeto
- [ ] T064 [US2] Criar `apps/web/src/features/documentos/application/useEnvioDocumento.ts` (reservar → escrever → finalizar → consultar) com estados distintos de recebimento e armazenamento
- [ ] T065 [US2] Criar `apps/web/src/features/documentos/infrastructure/SupabaseEnvioComandos.ts` e `SupabaseVersoesConsulta.ts` (+ `.test.ts` de cada), mapeando 413/422/404 para instrução de correção
- [ ] T066 [US2] Atualizar `apps/web/src/features/documentos/interfaces/DocumentosRealPage.tsx` com upload real, limite anunciado antes do envio, lista de versões, selo "recebido" × "armazenado no OneDrive" e instrução de erro
- [ ] T067 [US2] Atualizar `apps/web/src/features/jornada/interfaces/JornadaRealPage.tsx` com a lista "O que preciso fazer agora" e a fase seguinte **oculta** até a atual concluir (FR-021)
- [ ] T068 [P] [US2] Escrever `apps/web/src/features/documentos/interfaces/envio-documento.smoke.test.tsx` e `apps/web/src/features/jornada/interfaces/fase-seguinte-oculta.smoke.test.tsx`

### Transferência ao OneDrive

- [ ] T069 [US2] Criar `supabase/functions/arquivo-processar/index.ts` conforme `design-tecnico.md` §2.2: autenticação por segredo do Vault, `FOR UPDATE SKIP LOCKED`, lease de 5 min, validação de ancestralidade, sessão do Graph com segredo no Vault, fragmentos de 5 MiB, checkpoint em `bytes_enviados`; declarar teto via `checarLimite` (E14-S01 AC-6) mesmo sendo função interna — o gate `check:edge-functions` não distingue
- [ ] T070 [US2] Implementar em `supabase/functions/arquivo-processar/index.ts` a reconciliação de resposta perdida (procura o item determinístico `<requisito|cobranca>-<versaoId>.pdf` e compara tamanho antes de reenviar) e o backoff `min(2^tentativas min, 60 min)` respeitando `Retry-After`
- [ ] T071 [US2] Implementar o bloqueio legível em `supabase/functions/arquivo-processar/index.ts`: 401/403 → `bloqueado` com "reconectar conta Microsoft"; quota ou pasta ausente → motivo próprio; nunca marcar `armazenado` sem `item_id` confirmado
- [ ] T072 [US2] Escrever `supabase/functions/arquivo-processar/arquivo-processar.test.ts`: chamada sem segredo 401; lease impede dois processadores; indisponibilidade da Microsoft mantém versão `recebida` e trabalho `pendente`; resposta perdida reconcilia sem criar segundo item; 401 do Graph bloqueia com motivo
- [ ] T073 [US2] Criar `supabase/functions/arquivo-baixar/index.ts` (`GET ?versaoId=`): valida sessão, participação e papel, responde `Content-Disposition: attachment`, nunca persiste nem devolve URL do Graph; declarar teto via `checarLimite` (E14-S01 AC-6)
- [ ] T074 [P] [US2] Escrever `supabase/functions/arquivo-baixar/arquivo-baixar.test.ts`: versão de outro caso 404; versão restrita a outro papel 404; participante revogado 403; resposta sem URL do Graph
- [ ] T075 [US2] Criar `supabase/migrations/0022_E03-S07_cron_transferencia.sql` com o agendamento de `arquivo-processar` (a cada minuto), `arquivos.liberar_leases_expiradas()` e `arquivos.limpar_temporarios_confirmados()`, sem apagar versão `recebida` com transferência pendente
- [ ] T076 [US2] Escrever `supabase/tests/11-cron-transferencia_test.sql` provando que lease expirado volta a `pendente`, que temporário confirmado é limpo e que versão recebida pendente **não** é limpa
- [ ] T077 [US2] Registrar evidência dos 8 cenários da US2 em `specs/005-cliente-360-operacional/evidencias/us2.md`, incluindo a execução real contra a pasta corporativa de teste com arquivos fictícios

---

## Phase 6: US3 — Equipe revisa documentos e controla etapas (P1)

**Objetivo (spec US3)**: aprovação/devolução com motivo, versões preservadas, etapa e fase só pela
equipe. **Depende de US2** (precisa existir versão recebida).
**Teste independente**: solicitar ajuste, receber nova versão e aprovar, consultando o histórico.

- [ ] T078 [P] [US3] Escrever `apps/web/src/features/documentos/domain/revisao.test.ts`: devolução exige motivo; nova versão invalida a aprovação anterior como prova do requisito sem apagar a decisão; aprovação de versão obsoleta recusada
- [ ] T079 [US3] Criar `apps/web/src/features/documentos/domain/revisao.ts` com `DecisaoRevisao`, regras de versão e a invariante acima
- [ ] T080 [US3] Criar `supabase/functions/revisao-comandos/index.ts` com `revisar_documento` (decisão, justificativa obrigatória em `ajustes`, `revisaoEsperada`) gravando em `documentos.decisoes_revisao` de forma append-only; declarar teto via `checarLimite` (E14-S01 AC-6)
- [ ] T081 [US3] Implementar `decidir_etapa` e `liberar_fase` em `supabase/functions/revisao-comandos/index.ts`: verifica requisitos obrigatórios do caso, sem override no MVP, e recusa qualquer chamada de participante (403)
- [ ] T082 [US3] Escrever `supabase/functions/revisao-comandos/revisao-comandos.test.ts`: cliente tentando aprovar 403; `ajustes` sem motivo 422; duas decisões com a mesma revisão → a segunda 409; etapa com requisito obrigatório pendente 422; fase liberada fora de ordem 409
- [ ] T083 [US3] Criar `apps/web/src/features/documentos/application/useRevisaoComandos.ts` e `apps/web/src/features/jornada/application/useJornadaComandos.ts`
- [ ] T084 [US3] Criar `apps/web/src/features/documentos/infrastructure/SupabaseRevisaoComandos.ts` (+ `.test.ts`) e registrar no container
- [ ] T085 [US3] Atualizar `apps/web/src/features/documentos/interfaces/FilaRevisaoRealPage.tsx` com aprovar/devolver (motivo obrigatório), versão exata em revisão e aviso de conflito ao receber 409
- [ ] T086 [US3] Atualizar `apps/web/src/features/crm/interfaces/Clientes360RealPage.tsx` com o painel "Aguardando sua avaliação" (etapas em `em_analise`) e liberação de fase elegível
- [ ] T087 [US3] Adicionar `enviar_etapa_para_avaliacao` em `supabase/functions/envio-comandos/index.ts` (`pendente → em_analise`, sem concluir nem liberar) e cobrir em `envio-comandos.test.ts`
- [ ] T088 [P] [US3] Escrever `apps/web/src/features/documentos/interfaces/revisao-documento.smoke.test.tsx` cobrindo devolução com motivo, nova versão em revisão e histórico consultável
- [ ] T089 [US3] Registrar evidência dos 5 cenários da US3 em `specs/005-cliente-360-operacional/evidencias/us3.md`

---

## Phase 7: US4 — Pagamento com comprovante e conciliação humana (P1)

**Objetivo (spec US4)**: cobrança derivada do contrato, comprovante em conferência, confirmação só
pela equipe. **Depende de US1** (contrato) e **US2** (infraestrutura de arquivo).
**Teste independente**: cadastrar cobrança fictícia, enviar comprovante e confirmar pela equipe.

- [ ] T090 [P] [US4] Escrever `apps/web/src/features/pagamentos/domain/conciliacao.test.ts`: comprovante não leva a `pago`; vencido × em conferência distintos; BRL e USD nunca somados; divergência exige motivo
- [ ] T091 [US4] Criar `apps/web/src/features/pagamentos/domain/conciliacao.ts` com `StatusPagamento`, totais por moeda e as regras acima
- [ ] T092 [US4] Adicionar a ação `cadastrar_cobranca` em `supabase/functions/caso-comandos/index.ts`, exigindo `contrato_condicao_id` existente e recusando cobrança sem condição contratual correspondente (422)
- [ ] T093 [US4] Adicionar `conciliar_pagamento` em `supabase/functions/revisao-comandos/index.ts` (pago ou divergente, valor recebido, motivo, `revisaoEsperada`, `idempotencyKey`)
- [ ] T094 [US4] Estender `supabase/functions/caso-comandos/caso-comandos.test.ts` e `supabase/functions/revisao-comandos/revisao-comandos.test.ts`: cobrança sem condição 422; cliente tentando conciliar 403; duas conciliações concorrentes → 409; comprovante ausente impede `em_conferencia`
- [ ] T095 [US4] Reusar o fluxo de arquivo para comprovante em `apps/web/src/features/pagamentos/application/usePagamentoComandos.ts`, apontando `arquivos.versoes.pagamento_id`
- [ ] T096 [US4] Criar `apps/web/src/features/pagamentos/infrastructure/SupabasePagamentoComandos.ts` (+ `.test.ts`) e estender `SupabasePagamentosConsulta.ts` com condição de origem, comprovante e divergência
- [ ] T097 [US4] Atualizar `apps/web/src/features/pagamentos/interfaces/PagamentosRealPage.tsx` (portal: valor, moeda, vencimento, status, envio de comprovante, totais separados por moeda)
- [ ] T098 [US4] Criar `apps/web/src/features/pagamentos/interfaces/ConciliacaoRealPage.tsx` (equipe: conferir, confirmar, registrar divergência com motivo) substituindo a tela mock apenas na rota real
- [ ] T099 [P] [US4] Escrever `apps/web/src/features/pagamentos/interfaces/conciliacao.smoke.test.tsx` cobrindo "comprovante enviado ≠ pago" e totais separados
- [ ] T100 [US4] Registrar evidência dos 5 cenários da US4 em `specs/005-cliente-360-operacional/evidencias/us4.md`

---

## Phase 8: US5 — Carteira inteira (P2)

**Objetivo (spec US5)**: indicadores, filtros e detalhamento que levam exatamente aos casos que
produziram o total. **Depende de US1–US4** (precisa dos estados reais).
**Teste independente**: casos com documento ausente, revisão pendente e pagamento vencido; conferir
totais, filtros e vínculo com o 360.

- [ ] T101 [US5] Criar `supabase/migrations/0023_E03-S07_projecoes.sql` com `crm.resumo_caso`, `crm.carteira_casos`, `jornada.progresso_caso` e `jornada.previsao_protocolo` conforme `design-tecnico.md` §1.6, incluindo página de 50, cursor, totais completos por critério e `atualizado_em`
- [ ] T102 [US5] Escrever `supabase/tests/10-projecoes-carteira_test.sql`: totais por critério iguais aos itens detalhados; cadastro incompleto não vira zero; moedas separadas; vencimento próximo = 7 dias corridos; participante não alcança a projeção de admin
- [ ] T103 [US5] Criar `apps/web/src/features/crm/infrastructure/SupabaseCarteiraConsulta.ts` (+ `.test.ts`) com paginação por cursor, sem baixar a base inteira no browser
- [ ] T104 [US5] Criar `apps/web/src/features/crm/application/useCarteiraSupabase.ts` com filtros por programa, fase, responsável, tipo de pendência e prazo
- [ ] T105 [US5] Criar `apps/web/src/features/crm/interfaces/CarteiraRealPage.tsx` priorizando fila de trabalho e filtros, cada indicador abrindo seus casos, com `atualizadoEm` visível e lacuna/falha explícitas
- [ ] T106 [US5] Adicionar a rota da carteira em `apps/web/src/app/router.tsx` com `RequireRole` de admin, visível só fora do modo demo
- [ ] T107 [US5] Cruzar situação financeira (em dia × atrasado) com a fase em `CarteiraRealPage.tsx`, sem previsão de recebimento (isso é E10-S03)
- [ ] T108 [P] [US5] Escrever `apps/web/src/features/crm/interfaces/carteira.smoke.test.tsx` provando que falha de consulta aparece como falha e não como zero, e que vários impedimentos do mesmo caso permanecem visíveis
- [ ] T109 [US5] Registrar evidência dos 5 cenários da US5 em `specs/005-cliente-360-operacional/evidencias/us5.md`

---

## Phase 9: US7 — Avanço e previsão de protocolo (P2)

**Objetivo (spec US7)**: percentual de avanço com critério visível e estimativa de **protocolo**,
nunca de decisão do USCIS. **Depende de US5** (projeções no banco).
**Teste independente**: caso com entregas em datas distintas; conferir percentual, estimativa,
critério e comportamento com histórico insuficiente.

- [ ] T110 [P] [US7] Escrever `apps/web/src/features/jornada/application/calcular-previsao.test.ts` (estender o existente): menos de 3 entregas aprovadas → "sem previsão" com motivo; caso parado → sem data; prazos de análise do contrato somados; levantamento incompleto → sem percentual
- [ ] T111 [US7] Estender `apps/web/src/features/jornada/application/calcular-previsao.ts` com o cálculo de `progresso` e `previsaoProtocolo` a partir das projeções, mantendo a fórmula aberta e a data do cálculo
- [ ] T112 [US7] Criar `apps/web/src/features/jornada/application/usePrevisaoProtocolo.ts` e o adapter `apps/web/src/features/jornada/infrastructure/SupabaseProgressoConsulta.ts` (+ `.test.ts`)
- [ ] T113 [US7] Exibir percentual, critério, estimativa de protocolo e motivo de "sem previsão" em `apps/web/src/features/jornada/interfaces/JornadaRealPage.tsx` e no resumo do portal em `apps/web/src/features/jornada/interfaces/DashboardRealPage.tsx`
- [ ] T114 [US7] Adicionar a seção `progress.*` em `apps/web/src/shared/i18n/locales/{pt-BR,en}/portal.json` com a palavra **protocolo** explícita e nenhuma menção a decisão, aprovação ou chance
- [ ] T115 [P] [US7] Escrever `apps/web/src/features/jornada/interfaces/previsao-protocolo.smoke.test.tsx` provando o texto de estimativa de protocolo, o estado "sem previsão" e a ausência de qualquer promessa de aprovação
- [ ] T116 [US7] Registrar evidência dos 5 cenários da US7 em `specs/005-cliente-360-operacional/evidencias/us7.md`

---

## Phase 10: Polish e transversais

- [ ] T117 Remover o `UNION` temporário com `crm.meu_cliente_id()` de `crm.meus_casos()` em `supabase/migrations/0024_E03-S07_remove_vinculo_legado.sql`, depois de migrar os casos do piloto para `crm.participantes`, e rodar os testes SQL inteiros (a quebra aqui é o detector de contexto não migrado)
- [ ] T118 [P] Conferir i18n PT-BR/EN de todas as telas novas com `apps/web/src/shared/i18n` e provar ausência de texto hardcoded nos smoke tests
- [ ] T119 [P] Revisar as telas novas pela skill `impeccable`: hierarquia, foco, teclado, leitor de tela, uso em celular para envio e progresso de upload
- [ ] T120 [P] Atualizar `docs/glossary.md` com `participante`, `papel do programa`, `requisito restrito`, `reserva de envio`, `estimativa de protocolo` e `prioridade contratual`
- [ ] T121 [P] Atualizar `docs/ARCHITECTURE.md` com o schema `arquivos` e o predicado de autorização por participação (ADR-0018)
- [ ] T122 Atualizar `docs/SECURITY_DEBT.md`: fechar A-02 com a prova de T013 e registrar as dívidas que restarem (por exemplo cópia temporária no bucket durante a transferência)
- [ ] T123 Escrever `apps/web/e2e/cliente-360-operacional.spec.ts` cobrindo o ciclo inteiro autenticado: convite por papel, envio, revisão, nova versão, aprovação, comprovante, conciliação e carteira
- [ ] T124a (era T025, fase 2) Rodar `rtk pnpm run check:edge-functions` — as seis Edge Functions desta feature (`caso-comandos`, `revisao-comandos`, `envio-comandos`, `arquivo-baixar`, `arquivo-processar`, `onedrive-oauth`) já existem a esta altura; confirmar que cada uma chama `checarLimite` com teto declarado (E14-S01 AC-6) e que nenhuma ficou órfã em `supabase/config.toml`
- [ ] T124 Rodar `rtk pnpm run ci:local`, `rtk pnpm run arch:check`, `rtk pnpm run test:functions`, `rtk pnpm run lint:migrations`, `rtk pnpm run check:edge-functions` e `rtk pnpm e2e`, todos verdes, e colar as saídas em `specs/005-cliente-360-operacional/evidencias/gates.md`
- [ ] T125 Executar `/speckit-converge` e tratar o que voltar como tarefa nova neste arquivo até o estado ficar **Converged**
- [ ] T126 Executar `/revisao-adversarial` (@qa + @security) tentando quebrar cada AC — borda, erro parcial, concorrência, acesso cruzado por papel, abuso de reserva, gate que passa sem verificar — e transformar cada achado reproduzido em teste antes do PASS
- [ ] T127 Atualizar `docs/epics/ROADMAP.md` (status, AC verdes) e `docs/STATE.md` via `/handoff`

---

## Phase 11: Rollout — deixar disponível para o Bruno usar

**Dono**: `@devops` (único com `git push`, PR, deploy e gestão de ambiente). Nada aqui é opcional:
sem esta fase a feature existe no repositório e **não** existe para o Bruno.

- [ ] T128 Abrir o PR da branch com o ID da story no título, aguardar `gh pr checks` verde no agregador `ci` (cobre `qualidade`, `seguranca` e `db-tests`) sem check obrigatório pulado
- [ ] T129 Fechar **A-01** no Netlify: `VITE_DEMO_MODE=false`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configurados e novo build publicado — sem isso o site segue em modo demo e nenhuma tela real aparece
- [ ] T130 Aplicar as migrations `0017` a `0024` no Supabase de produção, em ordem, conferindo `lint:migrations` e os testes SQL no projeto remoto
- [ ] T131 Publicar as seis Edge Functions (`caso-comandos`, `revisao-comandos`, `envio-comandos`, `arquivo-baixar`, `arquivo-processar`, `onedrive-oauth`) e conferir `CORS_ALLOWED_ORIGINS` com o domínio de produção
- [ ] T132 Criar o bucket `envios` no projeto remoto com os mesmos limites e conferir que `SELECT` anônimo e `INSERT` fora de reserva são negados
- [ ] T133 Cadastrar no Vault o segredo `processador:arquivos` e o client secret do app Microsoft, e agendar `arquivo-processar` no Supabase Cron
- [ ] T134 Registrar o app no Entra ID da Akros com os redirects de produção, obter o consentimento do administrador do tenant e conectar a conta proprietária por Configurações → Conta Microsoft
- [ ] T135 Identificar e vincular a pasta corporativa raiz autorizada, conferindo pela UI que a conta, a pasta e o estado aparecem e que nenhum segredo é exibido
- [ ] T136 Concluir **E12-S04** em produção e convidar Bruno e Natália como admin, validando login, refresh e logout reais
- [ ] T137 Exercitar o fluxo completo em produção com **cliente fictício e arquivos fictícios** antes de tocar em caso real: convite por papel, envio, transferência ao OneDrive, revisão, comprovante, conciliação e carteira
- [ ] T138 Escrever `docs/runbook-cliente-360.md` com o passo a passo de operação e de incidente (reconectar Microsoft, reprocessar arquivo, trabalho bloqueado, revogar participante, reverter escrita)
- [ ] T139 Com Bruno e Natália, selecionar os casos do piloto (EB-2 NIW e visto R, cerca de três contratos ativos), registrar contrato e situação inicial, vincular as pastas existentes e conferir requisitos e cobranças caso a caso
- [ ] T140 Definir e comunicar a data a partir da qual as atualizações desses casos passam pelo produto, e acompanhar SC-001 a SC-008 durante o piloto, registrando o resultado em `docs/epics/ROADMAP.md`

**Bloqueio declarado**: o piloto do **visto R** (parte de T139) espera o **manual do visto R**
escrito pela Akros e cadastrado como programa com papéis, requisitos dirigidos e requisitos
restritos. Sem ele, T139 cobre só EB-2 NIW; o restante da feature não fica bloqueado.

---

## Dependências entre fases

```
Phase 1 Setup
   └─ Phase 2 Foundational  (A-02, participação, arquivos, bibliotecas)
        ├─ Phase 3 US1 Contrato e caso
        │     └─ Phase 4 US6 Participantes e papéis
        │           └─ Phase 5 US2 Envio e OneDrive
        │                 ├─ Phase 6 US3 Revisão e etapas
        │                 └─ Phase 7 US4 Pagamentos        (também depende de US1)
        │                       └─ Phase 8 US5 Carteira
        │                             └─ Phase 9 US7 Avanço e previsão
        └─ Phase 10 Polish  (fecha o legado, gates, adversarial)
              └─ Phase 11 Rollout (@devops)
```

US6 não é independente de US1: o contrato declara os participantes. US5 e US7 só têm o que mostrar
depois que US2–US4 produzem estado real.

## Paralelismo

- Phase 1: T002–T006 juntas.
- Phase 2: T021–T024 juntas depois de T020; T011/T013/T015/T018 são escritos em paralelo às suas
  migrations, nunca depois delas.
- Phase 3: T027 e T028 juntas; T034 em paralelo a T035.
- Phase 5: T055, T057, T063, T068 e T074 em paralelo aos respectivos comandos.
- Phase 10: T118–T122 juntas.
- **Nunca** em paralelo: duas tasks que tocam a mesma migration, o mesmo `index.ts` de função, ou
  `di.ts`/`real-repositories.ts`.

## MVP sugerido

Phases 1 a 5 (Setup + Foundational + US1 + US6 + US2) entregam o que o Bruno descreveu como o
gargalo atual: caso organizado por papel e arquivo do cliente chegando sozinho na pasta certa do
OneDrive. US3 fecha o ciclo de revisão e deve vir junto antes de qualquer piloto real — sem ela, o
documento chega mas ninguém decide dentro do produto.

## Decisões de implementação

Registre aqui, com data, toda escolha feita durante a execução que não estava no
`design-tecnico.md`, e todo `SPEC_DEVIATION`. Uma linha por item: o que foi decidido, por quê, e
qual arquivo carrega a marca.

| Data | Task | Decisão / desvio | Onde está marcado |
|---|---|---|---|
| 2026-10-15 | T031 | **Lacuna de desenho descoberta antes de implementar**: design-tecnico.md pedia "transação única por comando" para `caso-comandos`, mas Supabase-js chamado de dentro de uma Edge Function não dá transação entre dois `.insert()` separados. Decisão (controller, antes do dispatch, para não deixar cada task reinventar um padrão diferente): toda ação de `caso-comandos`/`revisao-comandos` que grava em mais de uma tabela vira uma função RPC `SECURITY DEFINER` em plpgsql, mesmo precedente já aceito no projeto (`crm.criar_cliente_a_partir_de_lead`, 0013; `comunicacao.registrar_entrada_canal`, 0016), chamada uma vez via `.rpc()`. Acrescentado: a RPC injeta `p_autor_id` em `request.jwt.claims` via `set_config(..., true)` **depois** da guarda de papel (nunca antes — inverteria a checagem) para que o trigger genérico de auditoria (`audit.registrar_mudanca()`, 0008) capture o autor real em vez de `NULL` (chamada `service_role` não carrega JWT de usuário final) — resolve de uma vez, para toda a feature, a lacuna que `design-tecnico.md` só tinha declarado em prosa ("registra explicitamente autor_id") sem dizer como | `design-tecnico.md` §2 "Correção em 2026-10-15"; aplica-se a toda Edge Function de comando desta feature a partir de T031 |
| 2026-10-11 | T025 | **Erro de sequenciamento no plano original**: T025 pedia "declarar teto das seis funções novas em `check-edge-functions.mjs`" dentro da fase 2, mas nenhuma das seis Edge Functions (`caso-comandos`, `revisao-comandos`, `envio-comandos`, `arquivo-baixar`, `arquivo-processar`, `onedrive-oauth`) é criada antes da fase 5 (US2)/6 (US3) — não havia o que declarar ainda. Corrigido: cada task que cria uma das seis (`T031`/`T054`/`T059`/`T069`/`T073`/`T080`) agora inclui "declarar teto via `checarLimite`" na própria descrição; a verificação do gate (`rtk pnpm run check:edge-functions`) move para uma task nova, `T124a`, na fase 10 (Polish), depois que todas existirem. `T026` (ci:local + test:functions) fica na fase 2, já alcançável agora | `tasks.md` T025/T031/T054/T059/T069/T073/T080/T124a |
| 2026-10-11 | Fase 2 (toda) | **Correção de ambiente**: esta sessão concluiu, ao checar só Docker (`docker info` falhou), que não havia Postgres disponível, e instruiu todas as tasks de T008 a T018 a "não executar SQL contra banco real, só revisar por leitura". Isso era **falso**: PostgreSQL 17 local via Homebrew (`/opt/homebrew/bin/postgres`, `pg_ctl`, `initdb`, `psql`) estava disponível o tempo todo, com serviço já rodando (`brew services list`). Descoberto durante T016-T018, quando aquela task aplicou migrations `0001`–`0020` do zero contra um banco real e rodou os testes SQL de verdade. **Confirmado de forma independente pelo controller** (não só aceito o relato da task): banco `crm_test` recriado do zero, shim (`00-shim-supabase.sql`) + as 20 migrations aplicadas sem erro, e a sequência completa `01`–`09` de `supabase/tests/` rodada ponta a ponta — **zero erro, todas as asserções passaram**, incluindo o teste mais crítico desta feature: `SELECT` em `crm.participantes` como participante autenticado não lança "infinite recursion" (resolve a pendência declarada do ADR-0020) e o isolamento por caso está correto (participante do caso A não vê linha do caso B). Gates de todas as tasks de banco desta fase (T008-T020) que diziam "não executado contra Postgres real" têm agora confirmação empírica real, não só leitura. **Daqui em diante**: toda task SQL desta feature deve executar `psql -h /tmp -p 5432 -U <usuário> -d <banco de teste>` de verdade — não há mais desculpa de "sem banco disponível" | `docs/adr/0020-security-definer-pontual-em-meus-casos.md` ("Pendência declarada — RESOLVIDA"); `.superpowers/sdd/progress.md` |
| 2026-10-11 | T011/T013/T015 | **Bug real encontrado na execução acima**: os testes `06-rls-participantes_test.sql` (T011), `07-rls-documentos-papel_test.sql` (T015) e `09-a02-sem-update-do-cliente_test.sql` (T013) foram escritos por três subagentes diferentes, cada um inventando independentemente a mesma convenção de UUID fictício (`a1111111...`, `e1111111...`, `b1111111...`, `c1111111...`, `f1111111...`) para `crm.clientes`/`auth.users`/`jornada.jornadas`/`jornada.fases`/`jornada.etapas`. Como o job `db-tests` roda todos os arquivos numerados na mesma sessão/transação cumulativa, `07` e `09` colidiam com linhas já inseridas por `06` (e por si mesmos entre si) — `duplicate key value violates unique constraint`, abortando o script inteiro antes de qualquer asserção rodar. **Corrigido** renomeando os UUIDs de `07` para o prefixo `a7.../b7.../c7.../d7.../e7...` e os de `09` para `a9.../b9.../c9.../d9.../e9.../f9...`, mantendo `06` como está (já era a referência, sem prefixo). Confirmado por execução real: as 9 sequências `01`-`09` agora passam sem erro. **Convenção daqui em diante**: todo teste SQL novo desta feature usa o número do próprio arquivo como primeiro dígito do UUID fictício, para nunca colidir com outro arquivo da mesma sequência | `supabase/tests/07-rls-documentos-papel_test.sql`, `supabase/tests/09-a02-sem-update-do-cliente_test.sql` |
| 2026-10-11 | T021 | Revisão adversarial encontrou inconsistência real entre as duas únicas camadas de autorização do sistema: `design-tecnico.md` §2 afirmava que `participacoesDoUsuario` seguia "a mesma regra de `crm.meus_casos()`/`crm.meus_papeis()`", mas a SQL (0017) não tem fallback do vínculo legado em `meus_papeis()`/`tenho_papel()` (só em `meus_casos()`), de propósito. O adapter real sintetizava `papel: "aplicante"` para o vínculo legado, o que faria `exigirPapel` autorizar num Edge Function com `service_role` (sem RLS por trás) uma ação que a leitura via RLS depois recusaria mostrar ao mesmo usuário. Corrigido: `Participacao.papel` aceita `null` para o vínculo legado; `exigirPapel` nunca casa `null` com papel exigido (lança 403, já que o usuário participa do caso, só não tem papel reconhecido); `resolverParticipacao` continua incluindo o vínculo legado (leituras "qual é o meu caso" não regridem). `design-tecnico.md` §2 corrigido para não afirmar mais a regra única inexistente | `supabase/functions/_shared/autorizacao-caso.ts` (tipo `Participacao`/`Papel`, `exigirPapel`), `io-supabase-caso.ts` (adapter real), `autorizacao-caso.test.ts` (2 casos novos), `design-tecnico.md` §2 |
| 2026-10-11 | T014 | Revisão adversarial encontrou 2 problemas em `0019`: (1) `REVOKE UPDATE, DELETE` em `documentos.decisoes_revisao` não cobria `TRUNCATE` — `service_role` ainda podia esvaziar a tabela append-only de uma vez; corrigido para `REVOKE UPDATE, DELETE, TRUNCATE`. (2) `crm.notas_internas` com zero `GRANT` a `authenticated` deixava a policy `admin_ve_todas_notas_internas` inalcançável mesmo para admin via PostgREST — mesmo erro já cometido e corrigido uma vez em `crm.contratos` (0017). Resolvido com o mesmo padrão: `GRANT SELECT` a `authenticated` + policy só-admin; "nunca no DTO do portal" segue garantido pela ausência de policy de participante, não pela ausência de GRANT | `supabase/migrations/0019_E03-S07_jornada_documentos_por_papel.sql` (comentários acima de cada GRANT corrigido) |
| 2026-10-11 | T021 | Descoberto: `requireAdmin(req)` e `requireServiceRole(req)` já existem em `_shared/auth.ts`, prontos — não recriar. T021 passa a só acrescentar `resolverParticipacao`/`exigirPapel`. Descoberto também: repositório tem padrão porta/adapter estabelecido para Edge Function com E/S (`_shared/webhook.ts` + `io-supabase.ts`); T021/T022/T023 seguem o mesmo desenho, com adapter real em `io-supabase-caso.ts` novo | `design-tecnico.md` §2; `tasks.md` T021/T022 |
| 2026-10-11 | T014/T022 | Lacuna no desenho original: nenhuma migration previa onde `idempotencia.ts` (T022) grava o resultado por `idempotencyKey`. Adicionada `comandos.idempotencia` (schema novo, só `service_role`) no início da migration `0019` (T014), antes das mudanças de jornada/documentos | `design-tecnico.md` §1.3 "Correção em 2026-10-11"; `tasks.md` T014 |
| 2026-10-11 | T005/T006/T114 | SPEC_DEVIATION de design-tecnico.md §3: repositório usa 4 namespaces i18n fixos (`common`/`site`/`portal`/`admin`), não arquivo por feature. Seções novas (`case.*`, `participants.*` em `admin.json`; `upload.*`, `progress.*` em `portal.json`) em vez de `caso.json`/`envio.json`/`jornada.json` | `design-tecnico.md` §3 atualizado; `tasks.md` T005/T006/T114 |
| 2026-10-11 | T010 | SPEC_DEVIATION do brief T008-T011: "contrato e condições são admin-only, sem GRANT a authenticated" é inviável como escrito — sem NENHUM GRANT a `authenticated`, o Postgres nega por privilégio de tabela antes de a RLS correr, para admin e participante igualmente. Isso contradiz os dois requisitos do próprio T011 na mesma brief ("admin lê todas as linhas de `crm.contratos`" e "participante não lê... retorna vazio, não erro"). Resolvido com `GRANT SELECT` (não INSERT/UPDATE/DELETE) a `authenticated` em `crm.contratos`/`crm.contrato_condicoes`, policy de SELECT só para admin, zero policy de participante — mesmo padrão já usado em `crm.leads` (0011) para tabela admin-only | `supabase/migrations/0017_E03-S07_participantes_contratos.sql` (comentário "SPEC_DEVIATION" acima dos dois `GRANT SELECT`) |
| 2026-10-11 | T009 | CONCERN levantado (risco de "infinite recursion detected in policy for relation participantes": `crm.meus_casos()` sem `SECURITY DEFINER` consulta `crm.participantes`, que tem policy própria chamando de volta `crm.participo_do_caso()` → `crm.meus_casos()`). **Primeira tentativa de correção** (adicionar só a policy direta `participante_ve_a_propria_linha` como disjunto não-recursivo) foi **revista e considerada insuficiente** em revisão adversarial: a detecção de recursão do Postgres é estrutural, na fase de rewrite/planejamento, não garantidamente evitada por ordem de avaliação de `OR` em tempo de execução. **Correção final, formalizada em ADR-0020**: `crm.meus_casos()` passou a delegar a leitura de `crm.participantes` para um helper interno novo, `crm._minhas_participacoes_ativas()`, com `SECURITY DEFINER` + `SET search_path = crm, pg_temp` (mesmo precedente de `audit.registrar_mudanca()`, 0008) — rompe a autorreferência de RLS de forma estrutural (dentro de uma função cujo dono tem BYPASSRLS, a consulta não reentra na RLS de `crm.participantes`), não por esperança no planejador. `crm.meus_casos()`/`meus_papeis()`/`tenho_papel()`/`participo_do_caso()` continuam **sem** `SECURITY DEFINER` nas próprias assinaturas — só o helper interno de uma linha carrega a exceção, nunca exposto a `authenticated` por chamada direta (mas precisou de `GRANT EXECUTE ... TO authenticated`, porque `crm.meus_casos()` não é DEFINER e roda como quem a chamou — ver comentário no SQL). A policy `participante_ve_a_propria_linha` foi mantida (não é mais o mecanismo que rompe a recursão, mas continua como exigência própria do desenho + defesa em profundidade). **Ainda não verificado contra Postgres real nesta sessão** (sem Docker/DB) — mesma pendência declarada, ver ADR-0020 seção "Pendência declarada": a primeira aplicação real desta migration precisa confirmar que não lança "infinite recursion" antes de qualquer migration `0018`+ ser considerada validada em produção. **Correção adicional (mesmo dia, 2ª revisão adversarial)**: o texto do ADR-0020 e o comentário do SQL diziam "nunca GRANT a authenticated", o que contradizia o `GRANT EXECUTE` que de fato existe no arquivo; faltava também o `REVOKE ALL ... FROM PUBLIC` que toda `SECURITY DEFINER` chamável deste repositório usa antes do `GRANT` explícito (padrão de `0016`). Ambos corrigidos: `REVOKE ALL` adicionado antes do `GRANT`, texto do ADR e do comentário do SQL ajustados para descrever o `GRANT` como deliberado, não como ausente | `docs/adr/0020-security-definer-pontual-em-meus-casos.md`; `supabase/migrations/0017_E03-S07_participantes_contratos.sql` (função `crm._minhas_participacoes_ativas()`, `crm.meus_casos()` reescrita, `REVOKE ALL`/`GRANT EXECUTE` e comentários acima de cada uma) |
| 2026-10-11 | T016-T018 | **Pendência da linha T009 acima, resolvida**: esta sessão (T016-T018) teve acesso a `psql`/`postgres` locais (Homebrew, fora do ambiente padrão desta feature) e, pela primeira vez nesta feature, aplicou `00-shim-supabase.sql` + `0001`–`0020` do zero e rodou os testes `01`–`09` contra um Postgres 17 de verdade, não só leitura estática. Resultado relevante para a linha T009: nenhuma "infinite recursion detected in policy for relation participantes" ocorreu em nenhum teste (`06`, `07` parcial, `08`) — o helper `crm._minhas_participacoes_ativas()` (ADR-0020) funciona como desenhado. A pendência "ainda não verificado contra Postgres real" da linha T009 está resolvida | Este relatório (`.superpowers/sdd/task-016-018-report.md`); nenhum arquivo de código mudou por esta verificação |
| 2026-10-11 | T016-T018 | **Bug real encontrado e corrigido** (só possível por ter rodado contra Postgres de verdade, ver linha acima): `0019` atualizou a policy de SELECT de `jornada.fases`/`jornada.etapas`/`documentos.documentos` para o modelo novo de participação (`crm.meus_casos()`), mas **esqueceu** `jornada.jornadas` — ficou com `cliente_ve_a_propria_jornada` (`cliente_id = crm.meu_cliente_id()`, só o vínculo legado). Como `participante_ve_fase_do_caso` (0019) resolve visibilidade de fase via sub-SELECT em `jornada.jornadas`, e esse sub-SELECT roda sob a RLS de `jornada.jornadas`, **nenhum participante do modelo novo conseguia ver nenhuma fase nem nenhum documento com `fase_id` preenchido** — `documentos.fase_liberada_para_portal()` sempre coalescia para `false`. Isto quebrava a US2/US3 por completo para qualquer caso que não seja o vínculo mono-titular legado, não só `arquivos.versoes` (que depende da mesma cadeia). `0019` é imutável (convenção do projeto); corrigido com `DROP POLICY`/`CREATE POLICY` em `0020`, mesmo predicado já usado nas outras três tabelas | `supabase/migrations/0020_E03-S07_arquivos_onedrive.sql` (bloco "SPEC_DEVIATION" no topo do arquivo, com `DROP POLICY`/`CREATE POLICY "participante_ve_jornada_do_caso"` logo antes do `CREATE SCHEMA IF NOT EXISTS arquivos`) |
| 2026-10-11 | T017 | **Bug real encontrado e corrigido** (idem): o predicado de INSERT de `storage.objects` do brief original (`EXISTS (SELECT 1 FROM arquivos.reservas_envio r JOIN arquivos.versoes v ...)` inline, sem `SECURITY DEFINER`) nunca funcionaria para nenhum participante real: `arquivos.reservas_envio` é admin-only por desenho (T016, zero policy de SELECT para participante), e o `EXISTS` de uma policy de storage.objects roda com o privilégio de quem faz o INSERT (`authenticated`) — sujeito à MESMA RLS. Participante nunca veria nem a própria reserva; o upload de arquivo (funcionalidade central da feature) nunca funcionaria para ninguém além de admin. Corrigido com o mesmo padrão já aceito no projeto para romper esse tipo de autorreferência (`crm._minhas_participacoes_ativas()`, ADR-0020): função `arquivos.reserva_ativa_para_objeto(text)` `SECURITY DEFINER` de uma linha, `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated`, devolve só um `boolean` (nunca uma linha) e trava a leitura em `criada_por = auth.uid()` — não concede privilégio novo além do que a própria policy já pretendia liberar. Confirmado funcionando contra Postgres real (cenário 4 de `08-rls-arquivos_test.sql`: INSERT com reserva própria passa, SELECT de volta continua vazio) | `supabase/migrations/0020_E03-S07_arquivos_onedrive.sql` (função `arquivos.reserva_ativa_para_objeto`, comentário "SPEC_DEVIATION" acima da policy `upload_so_com_reserva_ativa`) |
| 2026-10-11 | T016-T018 | Decisão: `storage.buckets`/`storage.objects` não existiam em `00-shim-supabase.sql` (primeiro uso de Supabase Storage nesta feature/repositório) — sem isso, o job `db-tests` quebraria na etapa "Aplicar migrations do zero" (`relation storage.buckets does not exist`) para QUALQUER sessão, não só esta. Adicionado stub mínimo (`storage.buckets`/`storage.objects`, colunas usadas por `0020`, `GRANT ALL` a `anon`/`authenticated`/`service_role` e `ENABLE` — não `FORCE` — RLS, espelhando o que o Supabase Storage real provisiona fora de `supabase/migrations/`). CONCERN: o shape exato de colunas/grants/RLS do Supabase Storage real (FORCE ou só ENABLE? quais colunas além das usadas aqui?) não foi confirmado contra um projeto Supabase de verdade nesta sessão — é a melhor reprodução disponível, não uma cópia confirmada; ver relatório desta task | `supabase/tests/00-shim-supabase.sql` (bloco "Stub minimo de Supabase Storage") |
| 2026-10-11 | T016-T018 | Decisão: `0020` é a primeira migration a tocar os schemas `arquivos` e `storage`. O gate `lint:migrations` exige `GRANT USAGE ON SCHEMA <schema>`/`GRANT ... ON <schema>.<tabela>` em QUALQUER migration (texto cumulativo) antes de aceitar `CREATE POLICY` naquele schema/tabela, e exige todo schema criado por migration estar em `[api] schemas` de `supabase/config.toml`. Adicionado `GRANT USAGE ON SCHEMA storage TO authenticated` + `GRANT INSERT ON storage.objects TO authenticated` em `0020` (documentando, não concedendo, privilégio que o Supabase Storage real já dá por padrão) e `"arquivos"` à lista `schemas` de `supabase/config.toml` (necessário de verdade: leitura de `arquivos.versoes`/`arquivos.vinculos_pasta` por participante passa por PostgREST) | `supabase/migrations/0020_E03-S07_arquivos_onedrive.sql`; `supabase/config.toml` |
| 2026-10-11 | T016-T018 | **CONCERN (fora do escopo desta task, não corrigido)**: ao rodar `00`–`0020` + `01`–`09` contra Postgres real pela primeira vez nesta feature, `07-rls-documentos-papel_test.sql` e `09-a02-sem-update-do-cliente_test.sql` falham com `duplicate key value violates unique constraint` — `07` reusa o mesmo `crm.clientes.id` (`a1111111-...`) que `06-rls-participantes_test.sql` já insere (sem `ROLLBACK`/`BEGIN` ao redor da semente, então persiste), e `09` reusa o mesmo `auth.users.id` (`e1111111-...`) que `07` insere antes de falhar. Isto bloqueia o job `db-tests` de verdade (`psql` cumulativo na mesma conexão/DB, confirmado lendo `.github/workflows/ci.yml`), para QUALQUER sessão que rode a suíte completa, não só esta — mas as sementes de `06`/`07`/`09` pertencem a T011/T013/T015, fora do escopo de T016-T018, e `supabase/tests/*_test.sql` (embora não seja migration 0001-0019) não foi tocado aqui para não ampliar o raio desta task. Precisa de correção (IDs únicos entre arquivos de teste) antes que `db-tests` passe de verdade | Não corrigido — ver relatório desta task |
| 2026-10-16 | T037 | **Decisão de escopo (confirmada pelo brief, registrada aqui para rastreio)**: `ContratoFormulario.tsx` NÃO inclui upload do PDF assinado (`case.contractSignedFile` já existe em i18n, mas sem campo no formulário) — a infraestrutura de arquivo (fase 5, `arquivos.*`/OneDrive) ainda não existe nesta base para o arquivo pousar; inventar um upload sem destino real seria pior que não ter o campo agora. Programa/versão do contrato são campos de texto livre (`case.contractProgramCode`/`contractProgramVersion`), não um seletor do catálogo de `programas/` — `crm.contratos.programa_id` é `text`, não FK (migration 0017), e puxar o catálogo de outra feature para este formulário é escopo maior do que T036-041 pede. Participantes/papéis (ADR-0018) também não entram neste formulário — são de outra task da feature | `apps/web/src/features/crm/interfaces/ContratoFormulario.tsx` (comentário de cabeçalho do arquivo) |
| 2026-10-16 | T038 | Decisão: pendências de documento/pagamento na fila "O que precisa de atenção" e no cabeçalho usam aproximação por contagem de tipo (`documentos.status`/`pagamentos.status` filtrados em `pendente`/`ajustes`/`em_analise` e `pendente`/`atrasado`/`em_conferencia`), sem prazo por item e sem critério uniforme de carteira — exatamente o que o brief de T036-041 autorizou ("carteira de verdade com critério uniforme é fase 8/9 futura, não invente mais do que isso agora"). `levantamentoEstado` ausente (sem jornada carregada) é tratado como `"incompleto"`, nunca como `"conferido"` por omissão — mantém FR-013 (ausência de dado nunca "parece" tudo em dia) | `apps/web/src/features/crm/interfaces/Clientes360RealPage.tsx` (`Cliente360Real`) |
