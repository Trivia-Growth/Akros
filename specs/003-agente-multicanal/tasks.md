# Tasks: Agente respondendo em WhatsApp e Instagram

**Story**: E13-S13 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Formato: `[ID] [US] descrição — gate`. AC = Acceptance Scenario de `spec.md` (US1-1 … US5-2).

## Phase 1: Banco (destrava US1–US5)

- [ ] T-01 [US1-5] **Teste vermelho primeiro:** shim do Vault com as assinaturas reais e teste SQL
      que prova a normalização de `+55 11 98888-1001` e a guarda do Vault — gate:
      `supabase/tests/05-*_test.sql` FALHA contra a `0016` atual
- [ ] T-02 [US1-1,US1-2,US1-4] Corrigir e generalizar a `0016` (guarda do Vault, regex `\D`,
      `contato_externo`, `webhooks_canal`, RPCs `*_canal`, escopos `meta-*`, `eventos` aceita
      `instagram`) — gate: `$SCR/dbtest.sh` (shim + migrations + testes em Postgres 17) verde
- [ ] T-03 [US1-1] Teste SQL de deduplicação por canal e por conta (Evolution, Meta WhatsApp,
      Instagram) — gate: idem

## Phase 2: Adaptadores e pipeline (Deno)

- [ ] T-04 [US2-1,US2-2,US3-1,US3-3] `_shared/canais/hmac.ts` e `meta.ts`: verificação do desafio,
      assinatura HMAC em tempo constante, parse de WhatsApp e Instagram com checagem de conta —
      gate: `deno test supabase/functions/_shared/canais/`
- [ ] T-05 [US1-1] `_shared/canais/evolution.ts`: parse v2 e `sendText`/`webhook/set` no formato v2
      — gate: idem
- [ ] T-06 [US1-1,US1-3,US1-4,US5-2] `_shared/agente.ts`: pipeline com dependências injetadas
      (handoff, IA, envio, conclusão, falhas) — gate: `deno test supabase/functions/_shared/agente.test.ts`
- [ ] T-07 [US1-2] `evolution-webhook` refatorado sobre o pipeline — gate: `deno check` + testes do pipeline
- [ ] T-08 [US2-1..US2-4] `meta-whatsapp-webhook` — gate: `deno check` + `pnpm run check:edge-functions`
- [ ] T-09 [US3-1..US3-3] `meta-instagram-webhook` — gate: idem
- [ ] T-10 [US4-1..US4-4] `integracoes-ia-salvar` com união por provedor, validação de HTTPS e ids,
      segredos só no cofre — gate: `deno test` do schema + `deno check`
- [ ] T-11 [US4] `supabase/config.toml`, `TETOS` de rate limit e `check-edge-functions` — gate:
      `pnpm run check:edge-functions`

## Phase 3: Tela

- [ ] T-12 [US4-1,US4-2] Formulário com tipo de canal (Evolution, WhatsApp oficial, Instagram), aviso
      do endereço de callback, gerar verify token no navegador; adaptar leitura de contas — gate:
      vitest da tela + `pnpm typecheck`
- [ ] T-13 [US5-1] Comunicação mostra o canal Instagram — gate: vitest

## Phase 4: Verificação e docs

- [ ] T-14 `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm run arch:check &&
      pnpm run lint:migrations && pnpm run check:edge-functions`, `deno test`, db-tests locais
- [ ] T-15 ADR-0017, runbook de rollout, ROADMAP, STATE, AJUSTES (A-03, A-04, A-05, A-19)
- [ ] T-16 `/revisao-adversarial`

## Phase 5: Rollout (@devops / dono) — fora do repositório, com confirmação explícita

- [ ] T-17 Aplicar `0016` no Supabase real (Management API ou CLI), conferir com
      `supabase_migrations.schema_migrations`
- [ ] T-18 Deploy das 4 functions e `CORS_ALLOWED_ORIGINS` com o domínio de produção
- [ ] T-19 Teste real ponta a ponta por canal (US1-1, US2-3, US3-2) e registro do resultado
