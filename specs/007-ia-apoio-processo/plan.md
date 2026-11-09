# Implementation Plan: IA de apoio ao processo — pré-análise e rascunho de resposta

**Branch**: `feat/E07-S05-ia-apoio-processo` | **Date**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-ia-apoio-processo/spec.md`

## Summary

Troca o `MockAnalisadorDocumento` por um fluxo real em três camadas, todas atrás da mesma porta
já existente (`AnalisadorDocumentoPort`): (1) pré-análise de legibilidade/qualidade rodando
inteiramente dentro da infraestrutura da Akros, sem IA nem rede externa; (2) cruzamento com o
requisito do visto por OCR local + texto mascarado enviado a um provedor de IA dedicado (chave
exclusiva no Vault); (3) rascunho de resposta ao cliente calibrado pelo prazo/prioridade do
contrato. As três etapas são sugestão — decisão e envio seguem exclusivamente humanos (ADR-0005).
A parte que exigiria enviar imagem crua a provedor externo fica fora de escopo (ver
`research.md` item 6 e a Assumption da spec) até ADR próprio.

## Technical Context

**Language/Version**: TypeScript (frontend: React 19 via Vite; backend: Deno nas Edge Functions,
mesmo stack de todo o repositório)

**Primary Dependencies**: Supabase (Postgres 17 + Edge Functions + Storage + Vault), biblioteca de
parsing de PDF compatível com Deno (ex.: `pdf-lib`), Tesseract.js (OCR local, wasm), OpenRouter
(chave dedicada e exclusiva desta finalidade, mesmo mecanismo BYOK do agente de atendimento
E13-S12 — decisão em `research.md` item 6)

**Storage**: Postgres (schema `documentos`, tabelas novas descritas em `data-model.md`); arquivo
em si permanece no bucket `envios`/OneDrive já existente (ADR-0019), nenhum arquivo novo
armazenado por esta feature

**Testing**: Vitest (domínio e adapters), Deno test (Edge Functions/jobs), SQL com `ASSERT`
(RLS das tabelas novas) — mesmo padrão do repositório (constituição IV)

**Target Platform**: Web (admin, dentro da fila de revisão já existente) + Edge Functions
(Supabase)

**Project Type**: Web application existente (frontend `apps/web` + backend Supabase) — esta
feature não cria novo projeto, estende `features/documentos`

**Performance Goals**: pré-análise (US1) disponível em até poucos minutos após o upload
(assíncrona, não bloqueia o fluxo); sem meta de tempo real síncrono

**Constraints**: nenhuma imagem/arquivo original sai da infraestrutura da Akros (FR-001, FR-006);
só texto mascarado chega ao provedor externo (FR-003); Edge Function tem timeout — por isso
pré-análise e OCR rodam no job assíncrono, não em request-response (`research.md` itens 2 e 4)

**Scale/Scope**: um caso ativo por vez tem um conjunto pequeno de documentos pendentes de
revisão (escala da carteira atual da Akros, não volume de SaaS multi-tenant)

## Constitution Check

*GATE: avaliado antes da Fase 0 (research) e reavaliado depois da Fase 1 (design).*

| Princípio | Situação | Observação |
|---|---|---|
| I. Spec é a fonte da verdade | ✅ | Plano deriva de `spec.md`; escopo (c) fora, documentado como Assumption, não silencioso |
| II. Portas e adapters | ✅ | Estende `AnalisadorDocumentoPort` já existente; mock e real atrás da mesma porta |
| III. Segurança OS-grade | ✅ | RLS/Vault seguem o padrão já provado (ADR-0012); provedor resolvido em 2026-11-06 — OpenRouter com chave exclusiva (`research.md` item 6), mesmo mecanismo já aprovado para o agente de atendimento (E13-S12). Sem ADR bloqueando `/speckit-implement` |
| IV. Teste prova o AC | ✅ | Cada FR/AC desta spec é testável (mascaramento verificável no payload, degradação sem IA testável, etc.) — tasks de teste entram no `/speckit-tasks` |
| V. Linguagem ubíqua e i18n | ✅ | Reaproveita termos já no glossário (`parecer`, `requisito`, `aderência`); "pré-análise", "rascunho de resposta" e "IA de apoio" entram no glossário no mesmo PR da implementação |
| VI. Interface com identidade | ✅ | UI nova (toggle de IA por caso, exibição de pré-análise/rascunho) entra na fila de revisão já existente, segue skill impeccable |
| VII. Rastreabilidade por story | ✅ | `E07-S05` no cabeçalho da spec, nas migrations (`NNNN_E07-S05_*.sql`) e nos commits |
| VIII. Honestidade sobre conhecimento | ✅ | Risco técnico do OCR em Edge Function declarado como não resolvido (`research.md` item 4), não escondido |

**Resultado**: plano aprovado para `/speckit-tasks`, sem bloqueio de ADR. Única dependência
condicional que resta: se o spike de OCR (item 4 do research.md) mostrar que Tesseract.js não
cabe numa Edge Function, a task de infraestrutura correspondente pausa até decisão de worker
dedicado — nomeada em `tasks.md`, não escondida.

## Project Structure

### Documentation (this feature)

```text
specs/007-ia-apoio-processo/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
apps/web/src/features/documentos/
├── domain/
│   ├── types.ts                      # [estende] AnaliseDocumento, + PreAnalise, RascunhoResposta
│   └── mascaramento.ts               # [novo] regras puras de mascaramento por camada (testável sem I/O)
├── application/
│   ├── ports.ts                      # [estende] AnalisadorDocumentoPort.preAnalisar/rascunharResposta
│   └── useIaApoioCaso.ts             # [novo] liga/desliga IA de apoio por caso (FR-010)
├── infrastructure/
│   ├── SupabaseAnalisadorDocumentoReal.ts   # [novo] adapter real da porta estendida
│   └── MockAnalisadorDocumento.ts           # [mantém] caminho demo intocado
└── interfaces/
    └── FilaRevisaoRealPage.tsx       # [estende] exibe pré-análise, parecer real e rascunho

supabase/
├── migrations/
│   └── NNNN_E07-S05_pre_analise_rascunho_chamadas_ia.sql
└── functions/
    ├── documento-pre-analisar/       # [novo] job assíncrono — US1 (sem IA, sem rede externa)
    ├── documento-ocr-cruzamento/     # [novo] job assíncrono — US2 (OCR local + mascaramento + provedor)
    ├── documento-rascunho-resposta/  # [novo] US3 — gera rascunho a partir do parecer + contrato
    └── _shared/
        ├── mascaramento-pii.ts       # [novo] camadas 1 e 2 do item 5 de research.md
        └── pre-analise-pdf.ts        # [novo] metadados de PDF/imagem do item 3 de research.md
```

**Structure Decision**: segue a estrutura DDD já estabelecida
(`interfaces → application → domain ← infrastructure` dentro de `features/documentos/`,
constituição II). Os três jobs assíncronos novos seguem o mesmo padrão de
`arquivo-processar`/`arquivo-baixar` (porta/adapter, `_shared/` para lógica testável sem Postgres
real). Nenhum projeto novo é criado.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Três Edge Functions novas (em vez de uma só) | Cada uma tem gate de dado diferente: a primeira nunca toca rede externa, a segunda manda texto mascarado para fora, a terceira só lê parecer/contrato já mascarados — misturar as três numa função só dificulta auditar "esta função nunca vê a imagem" (FR-001/FR-006) | Uma função só com `acao` discriminada (padrão de `caso-comandos`) foi avaliada; rejeitada porque o requisito mais sensível desta story é justamente isolar o que nunca sai da Akros do que sai mascarado — functions separadas tornam essa fronteira auditável no deploy, não só no código |
