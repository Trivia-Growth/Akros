---
name: SPEC
description: Base de reativação — leads que não fecharam, segmentados por objeção e momento, prontos para uma oferta futura.
story: E11-S05
tier: pequeno
alwaysApply: false
---

# SPEC — Base de reativação (E11-S05)

## User Story
Como **Akros**, quero **reencontrar leads antigos pelo motivo de não terem fechado**, para que
**um produto novo ou uma mudança de momento vire receita em vez de recomeço**.

## Contexto
Fecha o raciocínio do Bruno: guardar tudo (E11-S02) só vale se houver como **usar** depois. Dois
gatilhos concretos que ele citou — o lead que não tinha budget e passa a ter, e o lançamento de um
produto mais acessível (curso, consultoria enxuta, processo mais automatizado) que atende
exatamente quem foi recusado por preço.

## Acceptance Criteria

### AC-1: A base existe e se alimenta sozinha
```gherkin
Given  leads descartados, recusados no gate (E11-S04) ou sem resposta na cadência (E11-S03)
When   acesso a base de reativação
Then   todos estão lá, com perfil, objeção principal e data do último contato
And    vejo por qual caminho cada um chegou à base
```

### AC-2: Segmentar por objeção e momento
```gherkin
Given  a base de reativação
When   filtro por objeção principal, faixa de budget e momento de vida
Then   recebo o recorte correspondente
And    consigo salvar o recorte como segmento nomeado e reutilizável
```

### AC-3: Sugestão de quem reabordar agora
```gherkin
Given  leads na base
When   olho as sugestões
Then   vejo quem tem sinal de mudança de momento (ex.: recusa por budget há mais de 6 meses)
And    vejo o motivo da sugestão, não só o nome
```

### AC-4: Campanha de reativação
```gherkin
Given  um segmento selecionado
When   crio uma campanha de reativação
Then   defino a mensagem e o produto ofertado
And    vejo quantos leads serão alcançados antes de confirmar
And    cada envio vira evento na timeline do lead (E08-S01)
```

### AC-5: Lead que responde volta ao funil de verdade
```gherkin
Given  um lead reativado que responde
When   ele demonstra interesse
Then   volta ao kanban no estágio adequado, com todo o histórico anterior
And    a conversa antiga continua acessível, não recomeça do zero
```

### AC-6: Respeitar quem pediu para não ser procurado
```gherkin
Given  um lead que pediu para não ser mais contatado
When   monto qualquer segmento
Then   ele é excluído automaticamente
And    não existe caminho na interface para incluí-lo de volta em uma campanha
```

### AC-7: i18n + impeccable
```gherkin
Given  a base e as campanhas
When   troco idioma / avalio design
Then   traduz; o volume de cada segmento é legível de relance; impeccable passa
```

## Out of Scope
- Disparo real de mensagem em massa.
- Automação de reativação por gatilho de tempo — nesta rodada a campanha é iniciada por um humano.

## Notas de implementação
- Não é uma tabela nova: é uma **visão** sobre leads com estágio terminal + perfil (E11-S02).
- AC-6 é obrigação legal, não cortesia (LGPD e, para contato nos EUA, as regras locais). Implementar
  como exclusão na origem da consulta, não como filtro que alguém pode desmarcar. Registrar a
  questão de base legal e retenção em `docs/SECURITY_DEBT.md`.
