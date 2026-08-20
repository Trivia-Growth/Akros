---
name: SPEC
description: Base de conhecimento vira catálogo compartilhado entre agentes, cadastrado numa aba geral em /admin/comunicacao.
story: E04-S10
tier: pequeno
alwaysApply: false
---

# SPEC — Base de conhecimento compartilhada (E04-S10)

## User Story
Como **admin**, quero **cadastrar bases de conhecimento uma vez e usá-las em mais de um agente**,
em vez de cada agente ter sua própria lista duplicada e desconectada das outras.

## Contexto
Hoje `RegraAtendimentoIA.baseConhecimento: FonteConhecimento[]` é embutido e duplicado por agente
— editar uma fonte num agente não reflete em outro, mesmo que seja "o mesmo" guia. Vira um
catálogo único no store (`basesConhecimento: FonteConhecimento[]`), e cada agente referencia por
id (`baseConhecimentoIds: string[]`) — mesmo padrão já usado pra contas de agenda (E04-S07).

## Acceptance Criteria

### AC-1: Aba geral de base de conhecimento
```gherkin
Given /admin/comunicacao
When  vejo as abas
Then  existe uma 3ª aba "Base de conhecimento", ao lado de "Inbox" e "Agente IA"
```

### AC-2: Cadastro de fonte
```gherkin
Given a aba "Base de conhecimento"
When  adiciono uma fonte nova (nome, tipo, status)
Then  ela aparece na lista geral, disponível pra qualquer agente selecionar
```

### AC-3: Agente seleciona fontes do catálogo
```gherkin
Given um agente em edição (aba Agente IA)
When  vejo o card "Base de conhecimento"
Then  vejo checkboxes de todas as fontes do catálogo geral, marcadas conforme
      baseConhecimentoIds daquele agente
And   marcar/desmarcar e salvar persiste a seleção daquele agente especificamente
```

### AC-4: Mesma fonte em 2 agentes
```gherkin
Given uma fonte do catálogo selecionada em 2 agentes diferentes
When  edito o nome/status dela na aba "Base de conhecimento"
Then  a mudança aparece pros 2 agentes — não há cópia duplicada
```

## Out of Scope
- Upload real de documento / indexação real — cadastro continua mockado (nome, tipo, status,
  itens), sem processar conteúdo de verdade.
- Remoção de fonte que está em uso por algum agente — sem validação de dependência nesta rodada.

## Notas de implementação
- `comunicacao/domain/types.ts`: `FonteConhecimento` continua igual; `RegraAtendimentoIA`:
  `baseConhecimento` → `baseConhecimentoIds: string[]`.
- `mocks/bases-conhecimento.ts` (novo): catálogo seed compartilhado (reaproveita as fontes hoje
  duplicadas nos 2 agentes, sem duplicar).
- `store.ts`: `basesConhecimento: FonteConhecimento[]` + action `salvarBaseConhecimento` (cria ou
  atualiza uma fonte no catálogo).
- `ComunicacaoPage.tsx`: nova `TabsTrigger`/`TabsContent` "Base de conhecimento" com CRUD simples;
  card do agente (`AgentConfig`) passa a montar a lista a partir de `basesConhecimento` +
  `baseConhecimentoIds`, não mais de um array embutido.
