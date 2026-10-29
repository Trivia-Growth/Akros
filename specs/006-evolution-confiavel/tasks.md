# Tasks: Evolution confiável (E13-S15)

**Input**: `specs/006-evolution-confiavel/` (spec, plan, research, data-model, contracts)
**Regra**: teste primeiro, depois código. `[P]` = arquivos independentes. Story: E13-S15.

## Fase 1 — Módulos puros (Deno) — US1, US2, US3, US5

- [x] T001 [P] `canais/evolution-url.ts` + teste: HTTPS, sem credencial/consulta/fragmento, IP privado/loopback/link-local/metadata, DNS revalidado, redirect (FR-002)
- [x] T002 [P] `canais/evolution-estado.ts` + teste: estados, transições, `avaliarCompatibilidade`, comparação canônica de número (FR-003, FR-008, FR-011)
- [x] T003 [P] `canais/evolution.ts` + teste: telefone canônico (`:NN`, `@lid`, conflito), classificação do evento (texto, figurinha, mídia, grupo, `fromMe`, reação, apagada, conexão, QR, LID sem telefone) (FR-015..017, FR-026)
- [x] T004 `canais/evolution-cliente.ts` + teste com fetch falso: probe de versão, criar instância idempotente (`already in use`), `webhook/set` com `base64` + releitura (aceita plano e embrulhado), QR, estado + `ownerJid`, `findMessages` para LID, `getBase64FromMediaMessage`, `sendText`, apagar instância (FR-005..007, FR-017, FR-026)

## Fase 2 — Banco — todas as histórias

- [x] T005 Migration `0039_E13-S15_evolution_confiavel.sql` conforme `data-model.md` (tabelas, colunas, escopos do Vault, RPCs, bucket + policy) com rollback
- [x] T006 Teste SQL `21-evolution-confiavel_test.sql`: RLS (admin/cliente/anônimo), 1 servidor, escopos do Vault, telefone único x ambíguo, conversa não identificada invisível ao cliente, anexo no JSONB, recibo único (FR-018, FR-020, FR-025, FR-026)
- [x] T007 Rodar migrations do zero + todos os `*_test.sql` em Postgres 17 limpo; `pnpm lint:migrations`

## Fase 3 — Função admin `canal-evolution` — US1, US2, US3, US7

- [x] T008 `_shared/canal-evolution.ts` + teste: papéis, CSRF, rate limit, Zod `.strict()`, cada ação, falhas intermediárias, retomada, aceite de risco, número divergente, sem segredo na resposta (FR-001, FR-005..011, FR-019..021)
- [x] T009 `canal-evolution/index.ts` (fiação real), `config.toml`, `TETOS["canal-evolution"]`; `integracoes-ia-salvar` passa a recusar `evolution`; ajustar testes dela

## Fase 4 — Webhook e pipeline — US4, US5, US6, US8

- [x] T010 Teste e ajuste de `webhook-evolution.ts`: eventos de conexão, 401 antes do corpo, canal desativado, texto, LID (campo/histórico/conflito/sem prova ⇒ guardar), mídia, figurinha, grupo, `fromMe`, reação (FR-012..018, FR-025..027)
- [x] T011 Ajuste de `agente.ts` (tipo da entrada; anexo/figurinha ⇒ encaminhamento sem IA; não identificado ⇒ sem resposta) + `io-supabase.ts` (cliente único, upload de anexo, estado da conta) + testes (FR-018, FR-026, FR-027)

## Fase 5 — Smoke — FR-024

- [x] T012 `scripts/evolution-contract-smoke.ts` (casca Deno) + `_shared/canais/evolution-smoke.ts` testado com cliente falso: cinco capacidades obrigatórias (+ envio opcional com instância pareada), instância efêmera **apagada** em `finally`, saída sem segredo

## Fase 6 — Web — US1..US3, US5, US7, US8

- [x] T013 Domínio e porta `EvolutionCanalPort` e adapter Supabase (sem variante mock: só existe com backend real, como as demais consultas reais desta feature) (`canal-evolution`, leitura de servidor/matriz/contas) + testes
- [x] T014 `CanalEvolutionPainel` (servidor → canal → instância+webhook → risco+QR → estado), i18n PT-BR/EN, integração em `ConfiguracoesRealPage` + testes (estados, erros, nada de segredo no DOM)
- [x] T015 Comunicação (admin): “Contato não identificado”, anexo com link temporário, “anexo não baixado” + testes

## Fase 7 — Fechamento

- [x] T016 ADR-0021, glossário, runbook (`docs/runbook-rollout-agente.md`), `docs/STATE.md`, ROADMAP
- [x] T017 Gates: `test:functions`, `lint`, `lint:migrations`, `check:edge-functions`, `arch:check`, vitest, typecheck, build
- [x] T018 Passada adversarial própria (borda, erro parcial, concorrência, abuso) — 5 achados corrigidos com teste: corrida entre duas instalações de webhook, teste para o próprio número, troca de servidor sem reiniciar canais, leitura de mídia sem teto de memória, encaminhamento repetido — e conferência spec × código (FR-013 esclarecido). **Pendente:** `/revisao-adversarial` por revisor independente antes do PASS.
## Fase 8 — Transcrição de áudio — US9 (ADR-0022)

- [x] T020 [P] `canais/transcricao.ts` + teste: multipart (.ogg/.mp3/.m4a/.wav/.webm), Bearer, idioma opcional, códigos de falha sem corpo nem chave, corte em 4000 caracteres, Content-Length absurdo, `verificarProvedor` (Groq: lista; OpenRouter: chave + lista) (FR-029..FR-031)
- [x] T021 Migration `0040_E13-S15_transcricao_audio.sql` (tabela única, `CHECK` de ligada exige aceite+prova, escopo `transcricao` no Vault **mantendo os do OneDrive**, RLS FORCE, auditoria) + teste SQL `22-transcricao-audio_test.sql` (inclui regressão dos escopos `microsoft-graph`/`upload-sessao`)
- [x] T022 `canal-transcricao.ts` + teste: `salvar_transcricao` (linha antes do segredo, aceite por provedor, troca derruba prova), `testar_transcricao` (desliga em rejeição definitiva, não em queda; corrida de configuração), `definir_transcricao_ativa`; integrado em `canal-evolution` (schema estrito, CSRF, chave fora de resposta e log) (FR-031)
- [x] T023 `webhook-evolution.ts`: transcrever áudio baixado antes de registrar, falha ⇒ motivo em código + encaminhamento, teto 120/h, só áudio, reentrega não transcreve, não identificado só para a equipe; `io-supabase.ts` (`transcricao()`), `evolution-webhook/index.ts` (teto), `TETOS["transcricao-audio"]` (FR-029, FR-030, FR-032)
- [x] T024 Web: domínio, porta, adapter, hook e `TranscricaoAudioPainel` (aceite, chave write-only, um passo por vez), i18n PT-BR/EN + testes; Comunicação mostra texto transcrito e motivo da falha (FR-033)
- [x] T025 ADR-0022, spec (US9, FR-029..FR-033, SC-010), contratos, data-model, quickstart 3b, runbook, glossário, STATE
- [ ] T026 **Não feito aqui (exige provedor e servidor reais):** áudio real de WhatsApp (Opus em Ogg) transcrito pelo provedor escolhido e medição do tempo ponta a ponta — `quickstart.md` passo 3b

- [ ] T019 **Não feito aqui (exige servidor real):** smoke contra o servidor Evolution do Akros e homologação com número de teste — checklist em `quickstart.md`

## Fase 9 — Correções da revisão adversarial do projeto (AV-01..AV-09)

Relatório: `evidencias/revisao-adversarial-projeto.md`. Cada item nasceu de teste vermelho.

- [x] T027 Migration `0041_E13-S15_cliente_sem_escrita_operacional.sql` + teste SQL `23-cliente-sem-escrita-operacional_test.sql`: cliente sem UPDATE em `crm.clientes` e `agenda.reunioes`; `GRANT INSERT` por coluna em `lgpd.*`; admin intacto (AV-01..AV-03)
- [x] T028 `rate-limit.ts`: origem pelo N-ésimo `x-forwarded-for` da direita ou cabeçalho da plataforma, `checarLimitePorIdentidade`, funções puras testadas sem permissão de ambiente (`rate-limit.test.ts`) (AV-04)
- [x] T029 `agente.ts`/`io-supabase.ts`: `cotaContato` antes da chamada paga, `TETOS["agente-ia-contato"]`, esgotou ⇒ encaminhamento sem repetir, log sem telefone (`agente.test.ts`) (AV-05)
- [x] T030 `check-edge-functions.mjs`: exige a CHAMADA de `checarLimite(` e teste de 429 por handler compartilhado + 3 testes de gate; testes de 429 de `envio-comandos`, `arquivo-baixar`, `arquivo-processar` (AV-06)
- [x] T031 `_shared/corpo.ts`: corpo lido em stream com corte no teto; aplicado a webhooks, `lead-capturar`, `telemetria-erro`, `sessao-login` e handlers autenticados (`corpo.test.ts`) (AV-07)
- [x] T032 `apps/web/vite.guardas.ts` + plugin de build: `vite build` falha com `VITE_SUPABASE_URL` e demo ligado (AV-08); AV-09 e as ressalvas em `docs/SECURITY_DEBT.md`
- [ ] T033 **Não feito aqui:** deploy da `0041` e das funções; pedido de teste com `X-Forwarded-For` forjado e ajuste de `RATE_LIMIT_PROXIES_CONFIAVEIS`/`RATE_LIMIT_IP_HEADER` (AV-04); re-verificação independente (`/revisao-adversarial`)

