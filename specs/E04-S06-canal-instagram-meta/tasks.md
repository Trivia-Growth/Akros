---
name: TASKS
description: Decomposição AC → task → gate — E04-S06.
story: E04-S06
alwaysApply: false
---

# TASKS — Canal Instagram / Meta (E04-S06)

## Task 1 — Domínio: canal Instagram + credenciais Meta
**AC:** AC-3
- `comunicacao/domain/types.ts`: `CanalComunicacao` ganha `"instagram"`.
- `configuracoes/domain/types.ts`: `CredenciaisMeta` + `IntegracaoExterna.credenciaisMeta?`.
- **Gate:** `pnpm typecheck` verde.

## Task 2 — Mocks: integração ativa, agente, conversa de exemplo
**AC:** AC-2, AC-4, AC-6
- `mocks/integracoes.ts`: card `instagram` → `ativa: true` + `credenciaisMeta` preenchido.
- `mocks/agente-ia.ts`: agente principal ganha `"instagram"` em `canais`.
- `mocks/conversas.ts`: nova conversa canal `"instagram"`, `atendidoPorIA: true`, mensagens
  `cliente`/`agente_ia`.
- **Gate:** `pnpm typecheck` verde; `pnpm test` verde (specs existentes não quebram).

## Task 3 — Store: action de credenciais Meta
**AC:** AC-1, AC-2
- `mocks/store.ts`: `atualizarCredenciaisMeta(integracaoId, patch)` — mascara `appSecret` e
  `accessToken` (últimos 4 caracteres), grava `appId`/`webhookVerifyToken`/`contaInstagramId` em
  claro, `ativa` conforme patch.
- **Gate:** `pnpm typecheck` verde.

## Task 4 — UI: formulário de credenciais Meta em Configurações
**AC:** AC-1, AC-2
- `configuracoes/interfaces/ConfiguracoesPage.tsx`: `IntegrationModal` renderiza formulário Meta
  (5 campos) quando `integracao.id === "instagram"`; chama `atualizarCredenciaisMeta`.
- **Gate:** `pnpm typecheck` + `pnpm lint` verdes; teste manual: abrir modal, salvar, reabrir e
  ver campos mascarados preenchidos.

## Task 5 — UI: seletor de canais no Agente IA
**AC:** AC-4
- `comunicacao/interfaces/ComunicacaoPage.tsx` (`AgentConfig`): card com checkboxes dos 3 canais,
  liga em `config.canais`, persiste via `salvarAgenteIA` (fluxo já existente).
- **Gate:** `pnpm typecheck` + `pnpm lint` verdes.

## Task 6 — UI: badge de canal no Inbox + i18n
**AC:** AC-5
- `comunicacao/interfaces/ComunicacaoPage.tsx` (`Inbox`): ícone/label de canal por conversa.
- `admin.json` (pt-BR/en): chave `comunicacao.channelInstagram`.
- **Gate:** `pnpm typecheck` + `pnpm lint` verdes.

## Task 7 — Gates finais
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm arch:check`, `pnpm audit:esteira` — todos
  verdes.
- Atualizar `docs/epics/ROADMAP.md` (E04-S06) e `docs/STATE.md`.
