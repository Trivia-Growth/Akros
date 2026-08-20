---
name: SPEC
description: Instagram (Meta Graph API) como canal atendido pelo agente de IA — credenciais Meta + seletor de canais no agente.
story: E04-S06
tier: pequeno
alwaysApply: false
---

# SPEC — Canal Instagram / Meta (E04-S06)

## User Story
Como **admin**, quero **conectar as credenciais da Meta e ligar o Instagram como canal do agente de
IA**, para que **leads que chegam pelo Instagram Direct sejam atendidos automaticamente, igual já
acontece no WhatsApp**.

## Contexto
Hoje `CanalComunicacao` só tem `"whatsapp_oficial" | "evolution"`. O card "Instagram Direct · Meta
Graph API" já existe em `/admin/configuracoes` (`mocks/integracoes.ts`), mas inativo e sem
credencial — e `RegraAtendimentoIA.canais` já existe no domínio (`comunicacao/domain/types.ts`) mas
**sem UI nenhuma** pra editar (gap pré-existente). Esta story: (1) credenciais reais da Meta
(App ID, App Secret, Access Token, Webhook Verify Token, Instagram Business Account ID) no lugar do
campo genérico de 1 chave; (2) `"instagram"` como valor válido de `CanalComunicacao`; (3) seletor de
canais na aba "Agente IA"; (4) uma conversa de exemplo vinda do Instagram, atendida por
`agente_ia`, visível no inbox. Consome `AgenteService`/`ConversaRepository` mock (ADR-0002) — sem
LLM real, sem OAuth real, sem webhook real (mesmo out of scope de `E04-S02`).

## Acceptance Criteria

### AC-1: Formulário de credenciais da Meta
```gherkin
Given /admin/configuracoes, card "Instagram Direct · Meta Graph API"
When  clico em "Configurar"
Then  vejo um formulário com 5 campos: App ID, App Secret, Access Token, Webhook Verify Token,
      Instagram Business Account ID (não o campo genérico de 1 chave usado por Stripe/HubSpot)
And   App Secret e Access Token são mascarados (mostram só os 4 últimos caracteres depois de salvos)
And   App ID, Webhook Verify Token e Instagram Business Account ID não são mascarados
```

### AC-2: Salvar credenciais ativa a integração
```gherkin
Given o formulário de credenciais da Meta preenchido
When  clico em "Salvar"
Then  a integração fica "Ativa"; reabrir o modal mostra os campos mascarados preenchidos com o que
      foi salvo (persistência em sessão, igual toda outra integração mockada)
```

### AC-3: Instagram é canal válido no domínio
```gherkin
Given o tipo CanalComunicacao
When  uma Conversa ou RegraAtendimentoIA referencia canal "instagram"
Then  compila e é tratado igual aos canais existentes (sem branch especial fora da UI)
```

### AC-4: Seletor de canais no agente
```gherkin
Given /admin/comunicacao, aba "Agente IA", agente selecionado
When  vejo a configuração do agente
Then  vejo um seletor com os 3 canais (WhatsApp Oficial, Evolution, Instagram) como checkboxes
And   marcar/desmarcar atualiza config.canais localmente
And   "Salvar agente" persiste os canais escolhidos (mesmo fluxo de salvarAgenteIA já existente)
```

### AC-5: Badge de canal por conversa no inbox
```gherkin
Given uma conversa no inbox com canal "instagram"
When  vejo a lista de conversas em /admin/comunicacao (aba Inbox)
Then  vejo um indicador do canal (ícone + label) na conversa, diferenciando de WhatsApp/Evolution
```

### AC-6: Conversa de exemplo do Instagram
```gherkin
Given os dados mockados de conversas
When  abro o inbox
Then  existe pelo menos 1 conversa com canal "instagram", atendidoPorIA = true, com mensagens de
      autor "cliente" e "agente_ia" — igual ao padrão da conversa de exemplo do WhatsApp
      (conversa-lead-juliana)
```

## Out of Scope
- OAuth real / App Review da Meta, webhook real de recebimento de mensagens do Instagram.
- Filtro de canal no inbox (dropdown "Todos os canais" já tem i18n mas nunca foi implementado —
  não é desta story).
- i18n de `AgentConfig` (aba Agente IA) e de `ConfiguracoesPage.tsx` — ambos já são hardcoded em
  PT-BR hoje (débito pré-existente, não introduzido aqui). Só o badge de canal no Inbox usa i18n,
  por já ser i18n'd.
- Custo de IA (`custoIA`, E04-S05) na conversa de exemplo do Instagram — opcional, não obrigatório.

## Notas de implementação
- `comunicacao/domain/types.ts`: `CanalComunicacao` ganha `"instagram"`.
- `configuracoes/domain/types.ts`: nova `CredenciaisMeta { appId; appSecretConfigurado;
  appSecretFinal?; accessTokenConfigurado; accessTokenFinal?; webhookVerifyToken;
  contaInstagramId }`; `IntegracaoExterna.credenciaisMeta?: CredenciaisMeta`.
- `mocks/integracoes.ts`: card `instagram` passa `ativa: true`, `credenciaisMeta` preenchido com
  valores fictícios plausíveis.
- `mocks/agente-ia.ts`: agente principal (o que já tem `["whatsapp_oficial", "evolution"]`) ganha
  `"instagram"` em `canais`.
- `mocks/conversas.ts`: nova conversa, canal `"instagram"`, `atendidoPorIA: true`.
- `mocks/store.ts`: nova action `atualizarCredenciaisMeta(integracaoId, patch)`, mesmo padrão de
  mascaramento (últimos 4 caracteres) de `atualizarIntegracao`.
- `configuracoes/interfaces/ConfiguracoesPage.tsx`: `IntegrationModal` renderiza formulário Meta
  quando `integracao.id === "instagram"`, senão mantém o formulário genérico atual.
- `comunicacao/interfaces/ComunicacaoPage.tsx`: badge/ícone de canal por conversa no Inbox (usa
  `t("comunicacao.channelOfficial"/"channelEvolution"/"channelInstagram")`); card de seleção de
  canais em `AgentConfig` (hardcoded PT, consistente com o resto da aba).
- i18n: nova chave `comunicacao.channelInstagram` em `admin.json` (pt-BR/en).
