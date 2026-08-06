---
name: SPEC
description: Fila de revisão no admin — parecer da IA como insumo, decisão humana registrada com autor e data.
story: E07-S03
tier: pequeno
alwaysApply: false
---

# SPEC — Fila de revisão humana (E07-S03)

## User Story
Como **case manager**, quero **uma fila de documentos já triados pela IA**, para que **eu gaste
meu tempo julgando conteúdo em vez de conferindo se o arquivo abre**.

## Contexto
Contrapartida do E07-S02 do lado da Akros, e onde o ADR-0005 se materializa: **a decisão é
humana, registrada, e é a única coisa que muda o status do documento**.

## Acceptance Criteria

### AC-1: Fila priorizada
```gherkin
Given  documentos em "em_analise" de vários clientes
When   acesso /admin/documentos
Then   vejo uma fila com cliente, programa, fase, documento, aderência da IA e tempo de espera
And    consigo ordenar por tempo de espera e filtrar por aderência e por programa
And    os "enviados apesar do alerta" ficam visivelmente marcados
```

### AC-2: Revisão com o parecer ao lado do documento
```gherkin
Given  um item da fila
When   abro a revisão
Then   vejo o documento e o parecer da IA lado a lado
And    vejo tipo detectado × tipo esperado, lacunas, sugestões e confiança
And    vejo há quanto tempo o cliente está esperando
```

### AC-3: Decisão humana é a única que muda o status
```gherkin
Given  um documento em revisão
When   escolho "aprovar" ou "pedir ajuste"
Then   o status muda para "aprovado" ou "ajustes"
And    fica registrado quem decidiu, quando, e se a decisão concordou ou divergiu da IA
And    ao pedir ajuste, sou obrigado a escrever o motivo que o cliente vai ler
```

### AC-4: Divergência com a IA é dado, não exceção
```gherkin
Given  decisões registradas ao longo do tempo
When   olho o resumo da fila
Then   vejo em que percentual a equipe concordou com a IA
And    vejo quais tipos de documento concentram divergência
```

### AC-5: Ação em lote sem atalho perigoso
```gherkin
Given  vários documentos com aderência "atende" e confiança alta
When   uso a seleção múltipla
Then   consigo abrir os selecionados em sequência para revisar rápido
And    NÃO existe "aprovar todos" sem abrir cada um — aprovação em massa sem leitura não existe
```

### AC-6: i18n + impeccable
```gherkin
Given  a fila e a tela de revisão
When   troco idioma / avalio design
Then   traduz; densidade de trabalho intenso segue o design system; impeccable passa
```

## Out of Scope
- Anotação sobre o documento (marcar trecho) — backlog.
- Reanálise automática após reenvio: o reenvio cria uma nova análise pelo fluxo normal do E07-S02.

## Notas de implementação
- Nova rota `/admin/documentos`, item novo no `AdminLayout`.
- A decisão gera evento na timeline de comunicação (ADR-0006) e registro no histórico do cliente.
- AC-5 é deliberadamente restritivo. Se a Akros pedir aprovação em massa depois, isso vira uma
  decisão consciente com ADR — não um atalho que apareceu na implementação.
