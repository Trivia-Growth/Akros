# Implementation Plan: Agente respondendo em WhatsApp e Instagram

**Story**: E13-S13 | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md) | **ADR**: ADR-0017

## Summary

Um pipeline único de atendimento (`_shared/agente.ts`) recebe entradas normalizadas e responde pelo
mesmo canal por onde veio. Cada canal é um adaptador (`_shared/canais/*`) com duas funções: ler a
entrega (autenticando antes) e enviar texto. Três Edge Functions finas (`evolution-webhook`,
`meta-whatsapp-webhook`, `meta-instagram-webhook`) ligam o adaptador ao pipeline.
`integracoes-ia-salvar` passa a aceitar os três tipos de canal. A migration `0016` (nunca aplicada)
é corrigida e generalizada no lugar.

## Technical Context

**Language/Version**: TypeScript em Deno (Edge Functions), SQL Postgres 17, React 19 (tela)
**Primary Dependencies**: Zod, `@supabase/supabase-js`, OpenRouter (HTTP), Graph API da Meta (HTTP),
Evolution API v2 (HTTP)
**Storage**: Postgres (`comunicacao`, `configuracoes`) + Supabase Vault (segredos)
**Testing**: `deno test` (adaptadores e pipeline com `fetch` injetado), SQL `ASSERT` em Postgres
real (db-tests), vitest (tela)
**Target Platform**: Supabase Edge Functions (Deno), navegador
**Constraints**: autenticar antes de parsear; nenhum segredo no navegador/log; rate limit
fail-closed; migration aplica no Supabase real (não só no shim)

## Constitution Check

| Princípio | Status |
|---|---|
| I. Spec fonte da verdade | ok — AC em `spec.md`; `tasks.md` cita cada um |
| II. Portas e adapters | ok — adaptador por canal atrás de uma interface; front só chama a function |
| III. Segurança OS-grade | ok — Vault, HMAC/token constante, `.strict()`, rate limit, RLS FORCE na tabela nova; sem policy de escrita para `authenticated` |
| IV. Teste prova o AC | ok — deno + SQL em Postgres real; achado A-03/A-04 vira teste que falha antes da correção |
| V. Linguagem/i18n | **desvio herdado**: `ConfiguracoesRealPage` já usa PT literal (SPEC_DEVIATION de E13-S12); mantido, não ampliado além do formulário |
| VI. Interface | ok — mesma tela, mesmos componentes |
| VII. Rastreabilidade | ok — migration segue `0016_E13-S12_*` (corrigida no lugar); commits `E13-S13` |
| VIII. Honestidade | ok — o que não foi executado (rollout, Meta/Evolution reais) fica declarado |

## Project Structure

```text
supabase/
├── migrations/0016_E13-S12_integracao_evolution_openrouter.sql   # corrigida e generalizada (nunca aplicada)
├── tests/00-shim-supabase.sql                                    # Vault com as assinaturas REAIS
├── tests/05-integracao-evolution-openrouter_test.sql             # + telefone, + canais Meta
└── functions/
    ├── _shared/
    │   ├── agente.ts             # pipeline: registrar → handoff → IA → enviar → concluir
    │   ├── agente.test.ts
    │   └── canais/{tipos,evolution,meta,hmac}.ts + *.test.ts
    ├── evolution-webhook/index.ts        # fino
    ├── meta-whatsapp-webhook/index.ts    # novo
    ├── meta-instagram-webhook/index.ts   # novo
    └── integracoes-ia-salvar/index.ts    # união por provedor
apps/web/src/features/configuracoes/      # formulário com tipo de canal
```

## Decisões

1. **Identidade do contato** vira `contato_externo` (telefone só com dígitos no WhatsApp; id do
   Instagram no Direct); único por (conta, contato) para os três provedores.
2. **Recibo genérico** `comunicacao.webhooks_canal` (era `webhooks_evolution`), com as RPCs
   `registrar_entrada_canal`/`concluir_entrada_canal`.
3. **Segredos** no Vault por escopo: `evolution:`, `meta-whatsapp:`, `meta-instagram:`,
   `openrouter:` + UUID. Formas: Evolution `{apiKey, webhookToken}`; Meta `{accessToken, appSecret,
   verifyToken}`; OpenRouter `{apiKey}`.
4. **Formatos**: Evolution v2 `sendText` com `{number, text}` e `webhook/set` com
   `{webhook:{enabled,url,headers,events,webhookBase64}}` (validados no projeto Atendimento);
   Meta `POST /{versão}/{phone_number_id}/messages` (WhatsApp) e `POST /{versão}/me/messages`
   (Instagram, Page token), versão única em `_shared/canais/meta.ts` com data de revisão.
5. **Verify token da Meta** é informado pelo administrador (campo na tela, com botão de gerar no
   navegador); nada volta do servidor.
6. **Falha externa não reenvia** (mantém E13-S12): recibo `falhou`, sem retry automático.
7. **Testes de function** com `deno test` e `fetch` injetado; entram no job `qualidade`.

## Complexity Tracking

Sem violações novas da constituição.
