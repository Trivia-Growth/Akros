---
name: SPEC
description: Provedor de transcrição (Fireflies / Microsoft Teams) configurável em /admin/configurações — a agenda só oferece transcrição quando um provedor está ativo.
story: E04-S08
tier: pequeno
alwaysApply: false
---

# SPEC — Transcrição configurável (E04-S08)

## User Story
Como **admin**, quero **configurar qual provedor de transcrição está ativo (Fireflies ou Microsoft
Teams)**, para que **a agenda só ofereça a opção de ver transcrição quando um provedor real estiver
conectado**, em vez de um selo "Fireflies" fixo e sem relação com nenhuma configuração.

## Contexto
Hoje `/admin/agenda` mostra "Ver transcrição" pra qualquer `Reuniao` com transcrição, com um badge
"Fireflies" fixo no código — sem nenhum card de integração, sem chave de API, sem estado
liga/desliga. Amplia o catálogo de `IntegracaoExterna` (mesmo padrão já usado pra Stripe/HubSpot,
E04-S06) com 2 entradas novas: Fireflies e Microsoft Teams (Graph API expõe transcrição de
reunião). `Transcricao` ganha campo `provedor` pra saber qual gerou aquele texto.

## Acceptance Criteria

### AC-1: Provedores de transcrição no catálogo de integrações
```gherkin
Given /admin/configuracoes
When  vejo a lista de integrações externas
Then  vejo 2 cards novos: "Fireflies" e "Microsoft Teams (transcrição)", com o formulário genérico
      de 1 chave (mesmo padrão de Stripe/HubSpot) — "Configurar" abre o modal, salvar ativa
```

### AC-2: Badge de transcrição reflete o provedor real
```gherkin
Given uma Reuniao com transcrição vinda do Fireflies
When  abro o modal de transcrição em /admin/agenda
Then  o badge mostra "Fireflies" (não mais hardcoded — vem de transcricao.provedor)
And   uma transcrição vinda do Microsoft Teams mostra o badge "Microsoft Teams"
```

### AC-3: Sem provedor ativo, sem opção de transcrição
```gherkin
Given nenhum provedor de transcrição ativo em /admin/configuracoes
When  vejo /admin/agenda
Then  o botão "Ver transcrição" não aparece em nenhuma reunião, mesmo que ela tenha uma
      Transcricao associada nos dados
```

## Out of Scope
- Sincronização real com a API do Fireflies ou do Microsoft Graph.
- Gerar transcrição nova a partir da configuração — transcrições continuam mockadas em
  `mocks/reunioes.ts`.
- Mexer no card "Status de conexão" (Gmail/Outlook) de `/admin/agenda` — fica pra quando a tool de
  agenda do agente (E04-S07) ligar isso a contas reais.

## Notas de implementação
- `configuracoes/domain/types.ts`: `CategoriaIntegracao` ganha `"transcricao"`.
- `mocks/integracoes.ts`: entradas `fireflies` e `teams-transcricao` (categoria `transcricao`,
  `fireflies` já `ativa: true` pra manter a demo funcionando como hoje).
- `agenda/domain/types.ts`: `Transcricao.provedor?: "fireflies" | "microsoft_teams"`.
- `mocks/reunioes.ts`: transcrições existentes ganham `provedor: "fireflies"`.
- `agenda/interfaces/AdminAgendaPage.tsx`: botão "Ver transcrição" condicionado a
  `integracoes.find(i => i.id === mapProvedorParaIntegracaoId(transcricao.provedor))?.ativa`; badge
  do modal usa `transcricao.provedor` em vez do texto fixo "Fireflies".
- `configuracoes/interfaces/ConfiguracoesPage.tsx`: `CATEGORY_ICON` ganha ícone pra categoria
  `transcricao` (ex.: `FileAudio`, já usado em `AdminAgendaPage.tsx`).
