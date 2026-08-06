---
name: SPEC
description: Timeline única e append-only de comunicação — WhatsApp, e-mail, chat do portal, reunião e evento de sistema num só fluxo.
story: E08-S01
tier: arquitetural
alwaysApply: false
---

# SPEC — Timeline unificada de comunicação (E08-S01)

## User Story
Como **Akros**, quero **um histórico único de tudo que foi dito com um cliente ou lead**, para que
**"o que ele falou em março" tenha uma resposta, em um lugar só**.

## Contexto
Ver ADR-0006. Hoje a mesma conversa vive em dois modelos que não se falam: o inbox de WhatsApp
(E04-S01) e o `Interacao` do CRM. Reunião e e-mail ficam num terceiro lugar. Esta story unifica
tudo em `EventoComunicacao`, append-only, e **absorve** `Interacao`.

## Acceptance Criteria

### AC-1: Um modelo, cinco canais
```gherkin
Given  um cliente com mensagens de WhatsApp, e-mails, mensagens do chat do portal, reuniões e mudanças de fase
When   consulto a timeline desse cliente
Then   todos aparecem como EventoComunicacao no mesmo fluxo, ordenados por tempo
And    cada evento identifica canal, direção, autor e conteúdo
```

### AC-2: Append-only de verdade
```gherkin
Given  um evento registrado
When   procuro por qualquer caminho de edição ou exclusão
Then   não existe nenhum
And    uma correção só é possível registrando um novo evento que referencia o anterior
```

### AC-3: Filtro e paginação desde o começo
```gherkin
Given  uma timeline com mais de 200 eventos
When   abro a visão 360
Then   os eventos carregam paginados, do mais recente para o mais antigo
And    consigo filtrar por canal, por direção e por período
And    consigo buscar por texto dentro da timeline
```

### AC-4: Interacao é absorvida sem perda
```gherkin
Given  os registros de Interacao existentes nos mocks
When   a migração roda
Then   cada um vira um EventoComunicacao de canal "sistema" ou "interno"
And    nenhuma tela que hoje consome Interacao quebra
And    o modelo Interacao deixa de existir no código
```

### AC-5: Anexo aponta para o documento, não duplica
```gherkin
Given  um evento com anexo que corresponde a um documento do checklist
When   olho o evento
Then   o anexo referencia o documentoId
And    consigo navegar do evento para o documento e ver seu status atual
```

### AC-6: Lead também tem timeline
```gherkin
Given  um lead que ainda não virou cliente
When   abro o lead no kanban
Then   vejo a timeline dele com os mesmos canais
And    ao converter o lead em cliente, a timeline é preservada e continua
```

### AC-7: i18n + impeccable
```gherkin
Given  a timeline
When   troco idioma / avalio design
Then   traduz; canais são distinguíveis por ícone e rótulo, nunca só por cor; impeccable passa
```

## Out of Scope
- O chat do portal em si (E08-S02) e a política de canal para documento (E08-S03).
- Sincronização real com WhatsApp API oficial / Evolution — nesta fase é mock. `origemId` já
  existe no modelo como chave futura de deduplicação.

## Notas de implementação
- Novo agregado no contexto `comunicacao`. Porta `TimelineRepository`.
- AC-4 é uma migração com consumidores: Cliente360, dashboard admin e kanban mudam junto.
- AC-3 não é otimização prematura — a timeline é o objeto que mais cresce no sistema.
- Distinção por canal precisa de ícone + rótulo (regra de acessibilidade: nunca só cor).
