# Implementation Plan: Evolution confiável (E13-S15)

**Branch**: `feat/E13-S15-evolution-confiavel` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: `specs/006-evolution-confiavel/spec.md` (FR-001 a FR-027, 8 histórias)

## Summary

Levar ao Akros o fluxo Evolution provado no TriviAtende (`origin/main` `2a6d0ab7`): servidor com
versão medida, instância criada pelo produto, webhook gravado **e relido**, QR e estado com número
esperado, remetente `@lid` sem adivinhação, telefone ambíguo sem vazamento, **nenhuma mensagem
descartada em silêncio** (anexos guardados, contato não identificado guardado). A saída continua
síncrona (retry/saúde/resposta humana = E13-S16).

Abordagem: módulos puros e testáveis em `supabase/functions/_shared/canais/` (URL segura, parsing de
evento, cliente HTTP da Evolution, estados), uma Edge Function admin nova (`canal-evolution`),
mudanças cirúrgicas no pipeline já existente (`webhook-evolution`, `agente`, `io-supabase`) e uma
migration (`0039`). UI nova no Configurações e ajuste em Comunicação. Decisão difícil de reverter
(schema novo, contrato externo, bucket de anexos): **ADR-0021**.

## Technical Context

**Language/Version**: TypeScript — Deno (Edge Functions), React 19 + Vite (web)
**Primary Dependencies**: Zod (entrada), Supabase JS, react-i18next; Evolution API v2 (contrato por
hipótese até o smoke), Supabase Vault e Storage
**Storage**: Postgres 17 (schemas `configuracoes`, `comunicacao`, `crm`), bucket privado
`comunicacao-anexos`
**Testing**: `deno test` (funções), SQL com `ASSERT` em Postgres 17 limpo (`supabase/tests`),
vitest + Testing Library (web), `pnpm check:edge-functions`, `pnpm lint:migrations`, `pnpm arch:check`
**Target Platform**: Supabase (Edge Functions + Postgres) e Netlify (SPA)
**Project Type**: web (monorepo `apps/web` + `supabase/`)
**Performance Goals**: mensagem de texto na conversa em ≤10 s (SC-008); anexo ≤ 15 MB
**Constraints**: segredo nunca no browser/log/banco de negócio; webhook autentica antes de parsear;
single-tenant (ADR-0009); servidor Evolution novo, versão desconhecida
**Scale/Scope**: 1 servidor, poucos números (canais), dezenas de conversas/dia

## Constitution Check

| Princípio | Situação |
|---|---|
| I. Spec é fonte da verdade | Spec 006 aprovada; sem `SPEC_DEVIATION` previsto |
| II. Portas e adapters | UI usa porta `EvolutionCanalPort` + adapter Supabase + mock; `arch:check` no gate |
| III. Segurança OS-grade | RLS FORCE nas tabelas novas; Vault para chaves; header secreto; rate limit e CSRF na função admin; Zod `.strict()`; bucket privado; sem DELETE |
| IV. Teste prova o AC | Cada AC mapeado em `tasks.md`; `/revisao-adversarial` antes de PASS |
| V. Linguagem ubíqua e i18n | Termos novos no glossário (`servidor Evolution`, `instância`, `contato não identificado`, `anexo`); UI nova com chaves PT-BR/EN |
| VI. Interface com identidade | Painel segue impeccable; verificação em browser real antes de concluir |
| VII. Rastreabilidade | `E13-S15` na spec, nos commits e em `0039_E13-S15_*.sql` |
| VIII. Honestidade | Relatório final separa o executado do só lido; contrato real só vale após o smoke |

Sem violações. Re-checado após o design (Phase 1): sem mudança.

## Project Structure

### Documentation (this feature)

```text
specs/006-evolution-confiavel/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── canal-evolution.md      # API admin (ações, entradas, saídas, erros)
│   └── evolution-webhook.md    # contrato do webhook recebido e do que a Evolution deve aceitar
└── tasks.md
```

### Source Code (repository root)

```text
supabase/
├── migrations/0039_E13-S15_evolution_confiavel.sql
├── tests/21-evolution-confiavel_test.sql
└── functions/
    ├── canal-evolution/index.ts                 # novo (admin)
    ├── evolution-webhook/index.ts               # usa manipulador atualizado
    ├── integracoes-ia-salvar/index.ts           # recusa provedor evolution
    └── _shared/
        ├── canal-evolution.ts                   # manipulador admin (deps injetadas)
        ├── webhook-evolution.ts                 # eventos de conexão, mídia, @lid
        ├── agente.ts                            # tipo da entrada, handoff para anexo
        ├── io-supabase.ts                       # RPCs novas, upload de anexo
        └── canais/
            ├── evolution.ts                     # parsing de evento + telefone canônico
            ├── evolution-url.ts                 # validação de URL do servidor (SSRF)
            ├── evolution-cliente.ts             # chamadas HTTP à Evolution
            └── evolution-estado.ts              # estados, transições, compatibilidade
scripts/evolution-contract-smoke.mjs (+ .test.mjs)
apps/web/src/features/
├── configuracoes/ (domain, application/ports, infrastructure, interfaces/CanalEvolutionPainel)
└── comunicacao/   (anexo e "contato não identificado" na leitura admin)
apps/web/src/shared/i18n/locales/{pt-BR,en}/configuracoes.json
docs/adr/0021-evolution-confiavel.md
```

**Structure Decision**: seguir a estrutura existente (DDD por feature no web; `_shared` + função fina
no Deno). Nada de pacote novo.

## Complexity Tracking

| Desvio | Por que | Alternativa simples rejeitada |
|---|---|---|
| Função nova `canal-evolution` em vez de estender `integracoes-ia-salvar` | Ações com estado e retomada (servidor, instância, webhook, QR, estado) não cabem num "salvar tudo"; hoje a função mistura canal e agente | Estender a função existente: mantém o acoplamento que escondeu a falha do webhook |
| Bucket de anexos próprio | Anexo de conversa não é documento do caso (`envios`/OneDrive) e tem política de acesso diferente | Reusar `envios`: mistura LGPD e política de papel |
