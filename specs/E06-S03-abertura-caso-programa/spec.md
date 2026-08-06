---
name: SPEC
description: Ao converter lead em cliente, o admin escolhe o programa e a jornada é instanciada a partir dele.
story: E06-S03
tier: pequeno
alwaysApply: false
---

# SPEC — Abertura de caso com escolha de programa (E06-S03)

## User Story
Como **admin**, quero **escolher o programa de visto ao abrir o caso do cliente**, para que
**a jornada, o checklist e os prazos certos apareçam sozinhos**.

## Contexto
Hoje o kanban (E03-S01) converte lead em cliente com `tipoVisto` como texto livre, e a jornada
vem sempre do template EB-2 NIW. Com dois programas no catálogo, a escolha vira decisão explícita
no momento da conversão — e é ela que determina tudo que o cliente vê depois.

## Acceptance Criteria

### AC-1: Escolha de programa na conversão
```gherkin
Given  um lead no estágio "fechado" no kanban
When   converto o lead em cliente
Then   sou obrigado a escolher um programa entre os ativos do catálogo
And    vejo, para cada um, nome, categoria e quantidade de fases
And    não consigo concluir a conversão sem escolher
```

### AC-2: Jornada nasce do programa escolhido
```gherkin
Given  a conversão com o programa "religioso-r-eb4" escolhido
When   abro o cliente recém-criado na visão 360
Then   a jornada tem as fases do programa religioso
And    os documentos pendentes são os do catálogo desse programa
And    o cliente registra programaId e programaVersao
```

### AC-3: Programa fica visível onde o caso é operado
```gherkin
Given  um cliente com programa definido
When   olho a lista de clientes, a visão 360 e o dashboard do portal
Then   o programa aparece identificado em cada um deles
And    no portal o cliente vê o nome do programa, não o código interno
```

### AC-4: Troca de programa é decisão registrada, não edição silenciosa
```gherkin
Given  um cliente com jornada em andamento
When   o admin troca o programa do caso
Then   recebo um aviso explícito de que a jornada será reinstanciada e o progresso atual se perde
And    a troca só acontece após confirmação
And    a mudança fica registrada no histórico do cliente com autor e data
```

### AC-5: i18n + impeccable
```gherkin
Given  o fluxo de conversão
When   troco idioma / avalio design
Then   traduz; o seletor de programa segue o design system; impeccable passa
```

## Out of Scope
- Criar ou editar programas (só seleção).
- Migrar caso de um programa para outro **preservando** o progresso — problema real, mas exige
  mapeamento entre fases de programas diferentes. Fica registrado como pergunta em aberto.

## Notas de implementação
- Estende o fluxo de conversão do E03-S01.
- AC-4 é destrutivo: exige confirmação e registro. Não implemente como um `<Select>` solto.
