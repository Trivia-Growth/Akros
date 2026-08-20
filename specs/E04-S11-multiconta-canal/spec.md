---
name: SPEC
description: Múltiplas contas por canal (WhatsApp, Instagram) cadastráveis em /admin/configurações — agente escolhe contas específicas, não só o tipo de canal.
story: E04-S11
tier: pequeno
alwaysApply: false
---

# SPEC — Múltiplas contas por canal (E04-S11)

## User Story
Como **admin**, quero **cadastrar mais de um número de WhatsApp e mais de uma conta de Instagram
no sistema**, como já é possível com e-mail, e escolher em cada agente quais contas específicas
ele atende.

## Contexto
Hoje o agente escolhe canal por **tipo** (`canais: CanalComunicacao[]` — "whatsapp_oficial",
"evolution", "instagram"), sem noção de conta específica. Vira um catálogo dinâmico
`ContaCanalConectada[]` — mesmo padrão de `ContaAgendaConectada` (E04-S07): várias contas por
provedor, cada uma com nome de exibição e identificador (número ou @handle).

## Acceptance Criteria

### AC-1: Cadastro de conta de canal
```gherkin
Given /admin/configuracoes
When  vejo a seção "Contas de canal conectadas"
Then  posso conectar uma conta escolhendo o provedor (WhatsApp Oficial, Evolution, Instagram),
      nome de exibição e identificador (número/@handle)
```

### AC-2: Múltiplas contas do mesmo provedor
```gherkin
Given a seção de contas de canal
When  conecto 2 números de WhatsApp diferentes
Then  ambos aparecem na lista, cada um com seu próprio identificador
```

### AC-3: Desconectar conta
```gherkin
Given uma conta de canal conectada
When  clico em "Desconectar"
Then  ela sai da lista e some da seleção disponível em qualquer agente
```

### AC-4: Agente escolhe contas específicas
```gherkin
Given /admin/comunicacao, aba Agente IA
When  vejo o card "Canais atendidos"
Then  em vez de tipos de canal, vejo checkboxes das contas conectadas ativas (ex.: "WhatsApp
      +55 11 ... — Atendimento", "Instagram @akrosimmigration")
And   salvar o agente persiste quais contas específicas ele atende
```

## Out of Scope
- Ligar `Conversa` a uma conta específica — a conversa continua só com `canal` (tipo), sem
  `contaCanalId`. Fica pra decisão de produto futura.
- Mudar os cards de credencial já existentes em Integrações (WhatsApp Business / Instagram Direct)
  — continuam representando a credencial da API, coexistindo com o catálogo de contas.

## Notas de implementação
- `configuracoes/domain/types.ts`: `ProvedorCanal = "whatsapp_oficial" | "evolution" |
  "instagram"` (tipo local, não importa de `comunicacao` — mesmo desacoplamento já usado pra
  `CredenciaisMeta`); `ContaCanalConectada { id; provedor; nomeExibicao; identificador; ativa;
  conectadoEm }`.
- `comunicacao/domain/types.ts`: `RegraAtendimentoIA.canais` → `contasCanalIds: string[]`.
- `mocks/contas-canal.ts` (novo): seed com pelo menos 2 contas WhatsApp + 1 Instagram.
- `store.ts`: `contasCanal: ContaCanalConectada[]` + actions `conectarContaCanal`/
  `desconectarContaCanal` (mesmo padrão de `conectarContaAgenda`/`desconectarContaAgenda`).
- `configuracoes/interfaces/ConfiguracoesPage.tsx`: nova seção "Contas de canal conectadas",
  mesmo padrão visual de `ContasAgendaSection`.
- `ComunicacaoPage.tsx`: card "Canais atendidos" passa a listar `contasCanal` em vez dos 3 tipos
  fixos; `Inbox`/badge de canal por conversa continuam usando `Conversa.canal` (tipo), sem mudança.
