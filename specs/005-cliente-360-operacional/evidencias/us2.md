# Evidências — User Story 2 (Participante acessa a jornada e envia documento)

**Atualização 2026-10-27:** o 360 inclui painel para vincular uma pasta por ID. O Graph recusa
item que não é pasta, e a migration 0030 impede associar jornada de outro cliente. Testes com
respostas simuladas e Postgres verificam os caminhos; falta validação com o tenant corporativo.
As migrations 0031 e 0032 tratam envio de requisito comum, acesso a requisito restrito e
autorização na finalização, inclusive após revogação; essas verificações também precisam ser
exercitadas na stack real durante o teste ponta a ponta.
Migration 0033 e `arquivo-baixar` negam leitura e download de requisito restrito sem papel válido;
a equipe mantém acesso para corrigir o cadastro.
Migration 0034 valida se o familiar de uma nova solicitação ou participação pertence ao caso;
dados já existentes precisam de auditoria no ambiente de destino.
Migration 0035 revalida participação, papel e fase na autorização de objeto reservado; falta
testar revogação durante retomada TUS contra Storage real.
Migration 0036 impede limpeza direta por SQL: o processador recupera leases expiradas e remove
temporários confirmados pela API do Storage. Testes simulam a API; falta execução hospedada.
O 360 permite solicitar documentos do catálogo para caso, participante ou familiar; migration
0037 valida requisito ativo e fase no servidor. Os dados do catálogo real precisam ser conferidos.

**Fecha a Fase 5 (US2) — tasks T069-T077, Frente C (transferência ao OneDrive, ADR-0019).**
Para cada cenário de aceite de `spec.md` (User Story 2), uma frase de como foi verificado nesta
entrega. Mesmo padrão de `evidencias/us1.md`/`us6.md`: não repete prova que já existe (T054-T068,
recebimento durável — frente paralela), referencia; e documenta gap honesto em vez de esconder.

**Escopo desta entrega**: só a frente de BACKGROUND da Fase 5 — `arquivo-processar` (transferência
Supabase Storage → OneDrive, T069-T071), `arquivo-baixar` (download controlado, T073), cron/limpeza
(T075-T076). O recebimento durável (`envio-comandos`, `reservar_envio`/`finalizar_envio`) é outra
frente paralela (T054-T068), fora desta evidência — os cenários abaixo citam o contrato dela
(design-tecnico.md §2.1) só para compor o fluxo ponta a ponta, sem reprovar o que ela já provou.

## Cenário 1

> **Given** participante com acesso ativo, **When** abre o portal, **Then** vê somente o caso de
> que participa, no que seu papel permite: jornada, documentos publicados, pagamentos e tarefas,
> sem notas internas da equipe.

**Fora do escopo desta frente** — visibilidade de jornada/documentos/pagamentos por papel é RLS já
provada em `07-rls-documentos-papel_test.sql` (migration 0019) e `08-rls-arquivos_test.sql`
(migration 0020), ambas rodadas de novo nesta entrega (continuam verdes com 0021-0025/0028
aplicadas por cima — ver "Prova SQL" abaixo). Esta frente não adiciona nem muda policy de leitura
de jornada/documentos/pagamentos.

## Cenário 2

> **Given** uma solicitação em fase liberada, **When** envia PDF válido dentro do limite anunciado,
> **Then** recebe confirmação de recebimento durável, com data, nome e estado de armazenamento.

**Parcialmente verificado por esta frente**: "recebimento durável" (criação de
`arquivos.trabalhos_transferencia` em estado `pendente`, na mesma transação do recebimento) é
contrato de `finalizar_envio` (T054-T068, frente paralela) — não reprovado aqui. O que esta
entrega prova é o PRÓXIMO passo, que o cenário também cobre ("estado de armazenamento"):
`arquivo-processar` adquire o trabalho `pendente` por lease (`arquivos.adquirir_trabalho_pendente`,
migration 0028) e o processa — provado com Postgres real, incluindo o caso de concorrência (ver
"Prova SQL" abaixo) e com Deno fakes para a troca de token/upload/reconciliação
(`arquivo-processar.test.ts`, 13 cenários, T072).

## Cenário 3

> **Given** arquivo recebido, **When** seu armazenamento no OneDrive termina, **Then** o
> documento indica armazenamento concluído e aponta para o arquivo na pasta do caso.

**Verificado (fake, T069/T072)**: `processarUmTrabalho` (`_shared/arquivo-processar.ts`) só grava
`arquivos.versoes.estado_armazenamento = 'armazenado'` depois de `item_id` confirmado pelo Graph
— seja pelo upload completo (`enviarFragmento` retorna `concluido: true` + `itemId`), seja pela
reconciliação (T070, item determinístico já existe com o tamanho certo). Teste
"upload completo grava item\_id, estado armazenado e descarta segredo da sessão" prova a
sequência completa com um fake de `IOGraphMicrosoft`. A interface agora oferece download da
versão armazenada via `arquivo-baixar`; adapter e tela foram testados com respostas simuladas.
O fluxo completo com Microsoft real ainda precisa de validação.

## Cenário 4

> **Given** indisponibilidade do OneDrive após recebimento durável, **When** consulta o envio,
> **Then** vê que foi recebido e aguarda armazenamento; a equipe vê a falha e pode reprocessar.

**Verificado (fake, T071/T072)**: teste "indisponibilidade da Microsoft (erro de rede) mantém
pendente, nunca bloqueia" prova que uma falha de rede (`GraphError` tipo `rede`, ou um `Error`
genérico) nunca marca `trabalhos_transferencia.estado = 'bloqueado'` — só incrementa `tentativas`
e recalcula `proxima_tentativa_em` com backoff (`min(2^tentativas min, 60 min)`, respeitando
`Retry-After` quando presente), mantendo a versão em `estado_armazenamento = 'pendente'`
(nunca tocada numa falha transitória) e o trabalho em `estado = 'pendente'` outra vez — exatamente
"recebido, aguardando armazenamento". "Equipe vê a falha e pode reprocessar": a tabela
`trabalhos_transferencia` é admin-only (`GRANT SELECT` a `authenticated` + policy
`admin_ve_todos_trabalhos_transferencia`, migration 0020, reconfirmada por `08-rls-arquivos_test.sql`
nesta entrega) — o dado para a equipe ver existe e está correto; a tela admin que lista/permite
reprocessar manualmente é de outra task (fora de T069-T077).

## Cenário 5

> **Given** uma solicitação bloqueada ou pertencente a outro cliente, **When** tenta enviar ou
> baixar arquivo inclusive por chamada direta, **Then** a ação é recusada e nenhum vínculo é
> alterado.

**Verificado (download, fake, T074)**: `arquivo-baixar.test.ts` prova "versão de outro caso (sem
participação alguma) → 404, sem revelar existência" e "versão ligada a contrato (admin-only) nunca
é alcançada por participante → 404". Nenhum teste grava nada no banco em caminho recusado — o
manipulador lança antes de qualquer escrita (não há escrita nenhuma no fluxo de download, só
leitura + proxy do binário). "Envio" (bloqueado/outro cliente) é contrato de `envio-comandos`,
frente paralela — não reprovado aqui.

## Cenário 6

> **Given** arquivo inválido, **When** tenta enviar, **Then** vê motivo e instrução de correção,
> sem documento tratado como recebido; envio sem persistência durável também não é confirmado.

**Fora do escopo desta frente** — validação de PDF (assinatura `%PDF-`, tamanho, MIME) é
`reservar_envio`/`finalizar_envio` (T054-T068, frente paralela).

## Cenário 7

> **Given** solicitação de documento de um familiar do caso, **When** o aplicante envia o arquivo,
> **Then** o documento mantém identificação desse familiar; vincular a familiar de outro caso é
> recusado.

**Fora do escopo desta frente** — vínculo com familiar/sujeito do documento é contrato de
`solicitar_documento`/`finalizar_envio` (migrations 0019/0024, frentes paralelas). O nome
determinístico que esta frente cria no OneDrive (`<requisito|cobranca>-<versaoId>.pdf`, T069 passo
6) é por `versaoId`, não por familiar — a identificação do familiar fica inteira em
`documentos.documentos`/`arquivos.versoes`, que esta frente só lê (nunca escreve
sujeito/familiar).

## Cenário 8

> **Given** fase atual com envios pendentes, **When** o participante abre a jornada, **Then** vê
> as tarefas apenas da fase liberada; as tarefas da fase seguinte não são listadas nem consultáveis
> por chamada direta antes de a fase atual estar concluída.

**Verificado parcialmente por esta frente, caminho de download (T074)**: teste "fase não liberada
→ 404" prova que `arquivo-baixar` nega o download de uma versão cujo documento está numa fase não
liberada (mesmo predicado de `documentos.fase_liberada_para_portal`, migration 0019) — "por chamada
direta" é literalmente o que este teste exercita (chamada direta à Edge Function, não pela UI). A
listagem de tarefas por fase em si é RLS de `jornada.fases`/`documentos.documentos`
(migrations 0019), já provada em `07-rls-documentos-papel_test.sql` — rodada de novo nesta entrega.

## Reconciliação de porta `IOGraphMicrosoft` (nota obrigatória)

`supabase/functions/_shared/graph-microsoft.ts` desta entrega é uma versão MÍNIMA da porta, com só
os métodos que `arquivo-processar`/`arquivo-baixar` precisam (troca de refresh token por access
token, validação de ancestralidade, criar sessão de upload, enviar fragmento, buscar item por
nome, baixar conteúdo). A Frente A (conexão Microsoft/`onedrive-oauth`, outro worktree) trabalha em
paralelo e pode ter criado — ou vir a criar — sua própria versão desta porta (troca de
`code`→token na primeira conexão, por exemplo). Ao integrar os dois worktrees, uma reconciliação de
porta é esperada: unificar os dois arquivos num só `_shared/graph-microsoft.ts` com todos os
métodos das duas frentes, resolvendo qualquer divergência de assinatura/tipo de erro
(`GraphError`/`TipoErroGraph` aqui). Isto não é erro desta entrega — é efeito natural de trabalho
paralelo sobre o mesmo serviço externo, e está listado como tarefa de integração explícita no
relatório desta task (`task-C-report.md`).

## Prova SQL (Postgres real)

Banco recriado do zero (`00-shim-supabase.sql` + `0001`-`0025` + `0028` — `0026`/`0027` são das
frentes paralelas A/B, não presentes neste worktree isolado; a sequência numérica tem um vão
esperado aqui, preenchido quando os três worktrees integrarem). Suites `01`-`09` continuam verdes
(`EXIT:0` em todas, nenhuma regressão das migrations novas) e a suite nova
`11-cron-transferencia_test.sql` prova, chamando as funções DIRETAMENTE via SQL (sem esperar tick
de `pg_cron`, que não roda neste ambiente — SPEC_DEVIATION documentada no topo de 0028):

- lease expirada (`estado = 'em_execucao'`, `lease_ate` no passado) volta a `pendente`, com
  `lease_ate`/`lease_dono` nulos, depois de `arquivos.liberar_leases_expiradas()`; lease AINDA
  válida não é tocada (controle negativo).
- a limpeza direta em `storage.objects` agora é recusada e mantém a referência; remover metadados
  via SQL não apaga o arquivo físico. O processador usa a API de Storage e só depois limpa a
  referência; os testes Deno verificam essa sequência com respostas simuladas.
- versão `recebida` com trabalho `pendente` continua preservada no teste SQL.

**Lease concorrente (T072, concorrência genuína, não simulada)**: duas sessões `psql` REAIS
disputando o MESMO trabalho `pendente`, via uma função temporária que espelha
`arquivos.adquirir_trabalho_pendente` com um `pg_sleep` entre o `SELECT ... FOR UPDATE SKIP LOCKED`
e o `UPDATE` (mesmo método já usado nesta feature para `crm.preparar_caso`/`crm.registrar_contrato`
— função temporária descartada depois do teste, nunca entra em migration). Sessão A inicia,
trava a linha e dorme 3s; sessão B inicia 0,3s depois, contra a MESMA linha: A recebe a linha
(1 resultado), B recebe **zero linhas** (não erro) — confirma que `FOR UPDATE SKIP LOCKED` nunca
deixa dois processadores pegarem o mesmo trabalho. A função real
`arquivos.adquirir_trabalho_pendente` foi testada separadamente, numa única sessão, com
`request.jwt.claims` carregando `role: service_role` (forma real como `clienteServico().rpc()`
chama, via chave privilegiada): devolveu a linha, gravou `estado = 'em_execucao'`/`lease_dono`
corretos; chamada sem essa claim (`current_user` cai no fallback, não é `service_role`) foi negada
com `42501`.

## Gap honesto ao final desta entrega

A spec pede, para US2, "incluindo a execução real contra a pasta corporativa de teste com arquivos
fictícios" — **isto não é possível neste sandbox**: não há tenant Microsoft real, app registration
no Azure AD, nem a stack Supabase completa (Edge Functions rodando de verdade, Cron real) disponível
aqui. O que FOI provado nesta entrega:

- Lógica de negócio dos 8 passos do contrato (design-tecnico.md §2.2) com Deno + fakes de
  `IOArquivoProcessar`/`IOGraphMicrosoft` — 13 cenários (`arquivo-processar.test.ts`) + 10 cenários
  de download (`arquivo-baixar.test.ts`).
- Lease/concorrência/cron-sem-pg_cron contra Postgres real (acima).
- `rtk pnpm run test:functions` (149/149), `rtk pnpm run lint:migrations` (26 migrations) e
  `rtk pnpm run ci:local` (typecheck/lint/vitest 256/256) verdes.

O que FICA como pendência de rollout (T133, fase 10, `@devops` + Akros IT):

- App registration real no Azure AD (OAuth delegado, escopos `Files.ReadWrite`/`offline_access`,
  ADR-0019 ponto 1) e a conexão admin-only (`onedrive-oauth`, Frente A) contra um tenant real.
- Cadastro do segredo/credencial que autentica o Cron contra `arquivo-processar`
  (`current_setting('app.settings.service_role_key')`, ver migration 0028) e do client secret
  Microsoft no Vault.
- Agendamento real de `arquivo-processar` via `pg_cron` — só roda em Supabase hospedado
  (`shared_preload_libraries` habilitado), não neste Postgres local.
- Execução ponta a ponta contra a pasta corporativa de teste com arquivo fictício real — só então
  a implementação de `_shared/graph-microsoft.ts` (REST real, nunca exercitada por nenhum teste
  desta entrega) encontra a API de verdade pela primeira vez.
