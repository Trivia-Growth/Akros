---
name: SPEC
description: Nenhum lead chega à agenda sem aprovação humana — fila de validação antes de liberar o agendamento.
story: E11-S04
tier: pequeno
alwaysApply: false
---

# SPEC — Gate humano antes do agendamento (E11-S04)

## User Story
Como **Bruno**, quero **validar cada lead antes de liberar o agendamento**, para que **a agenda da
Natalia só receba conversa que vale a hora dela**.

## Contexto
Posição explícita da Akros: a IA ajuda no follow-up, na organização do CRM e no relacionamento —
**não** na decisão final de qualificar. "Essa validação final eu ainda acho importante passar por
mim antes de liberar o agendamento da reunião."

Este gate é o espelho, no pré-venda, do gate de liberação de fase do E03-S03. Mesma filosofia:
o sistema prepara, o humano decide.

## Acceptance Criteria

### AC-1: Fila de aprovação
```gherkin
Given  leads com qualificação concluída
When   acesso a fila de aprovação
Then   vejo cada um com perfil, resumo da conversa e há quanto tempo espera
And    vejo uma leitura de fit gerada pelo sistema, identificada como sugestão
And    consigo aprovar, recusar ou pedir mais informação
```

### AC-2: Agendamento fica bloqueado até a aprovação
```gherkin
Given  um lead ainda não aprovado
When   ele tenta agendar por qualquer caminho
Then   não consegue
And    recebe uma mensagem de que a Akros vai retornar com os próximos passos
And    nenhum horário é reservado na agenda
```

### AC-3: Aprovação libera o agendamento
```gherkin
Given  um lead aprovado
When   ele recebe o retorno
Then   recebe o link ou os horários disponíveis
And    o lead avança para "reunião agendada" ao escolher
And    a aprovação fica registrada com autor e data
```

### AC-4: Recusa é registrada com motivo utilizável
```gherkin
Given  um lead recusado
When   registro a recusa
Then   sou obrigado a informar o motivo de uma lista curta mais texto livre
And    o lead vai para a base de reativação (E11-S05) com esse motivo
And    o motivo alimenta a segmentação futura
```

### AC-5: A sugestão do sistema nunca decide
```gherkin
Given  uma leitura de fit muito alta ou muito baixa
When   a fila é processada
Then   nada acontece automaticamente
And    não existe configuração de auto-aprovação nesta rodada
```

### AC-6: Tempo de espera é visível
```gherkin
Given  leads parados na fila
When   olho a fila
Then   os mais antigos aparecem em destaque
And    vejo o tempo médio de aprovação do período
```

### AC-7: i18n + impeccable
```gherkin
Given  a fila
When   troco idioma / avalio design
Then   traduz; a fila é operável em poucos cliques; impeccable passa
```

## Out of Scope
- Auto-aprovação por regra ou por score — deliberadamente fora (AC-5). Se a Akros quiser depois,
  vira decisão consciente com ADR.
- Integração real com Gmail/Outlook (já mockada em E04-S03).

## Notas de implementação
- Novo estágio ou flag entre "qualificado" e "reunião agendada" no kanban (E03-S01).
- A "leitura de fit" é heurística sobre o perfil (E11-S02), sempre rotulada como sugestão.
- AC-2 precisa valer em **todos** os caminhos de agendamento, inclusive o do bot. Testar o caminho
  do bot explicitamente — é o mais fácil de esquecer.
