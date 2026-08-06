---
name: SPEC
description: Cliente recebe o parecer da IA logo após o upload e pode corrigir antes de o documento entrar na fila da equipe.
story: E07-S02
tier: pequeno
alwaysApply: false
---

# SPEC — Feedback da IA para o cliente (E07-S02)

## User Story
Como **cliente**, quero **saber na hora se o documento que enviei serve**, para que **eu corrija
sozinho em vez de descobrir o erro semanas depois**.

## Contexto
Este é o ponto onde a IA gera valor para os dois lados: o cliente não fica esperando, e a equipe
não recebe lixo. É também onde a restrição de produto do Bruno se aplica — **reduzir fricção sem
tirar o comprometimento**. Por isso a IA aponta o que está errado e explica o porquê, mas **quem
resolve continua sendo o cliente**. Nada de "a gente corrige para você".

## Acceptance Criteria

### AC-1: Análise dispara no upload, com espera honesta
```gherkin
Given  um documento pendente no checklist
When   faço o upload
Then   o documento vai para "em_analise" e vejo um estado de carregamento com o que está acontecendo
And    em poucos segundos o parecer aparece no próprio card do documento
```

### AC-2: Parecer legível por quem não é advogado
```gherkin
Given  um parecer de aderencia "nao_atende"
When   leio o resultado
Then   vejo em uma frase o que está errado
And    vejo as lacunas separadas entre impeditivas e recomendadas
And    vejo o que fazer para corrigir, em linguagem de cliente, sem jargão de imigração
```

### AC-3: Tipo incorreto é dito com clareza
```gherkin
Given  que enviei uma carta de recomendação onde se pedia carta de experiência
When   a análise conclui
Then   vejo que o documento parece ser de outro tipo
And    vejo a diferença entre os dois em uma frase objetiva
And    vejo para qual item do checklist esse documento serviria, se servir a algum
```

### AC-4: Enviar assim mesmo é sempre possível
```gherkin
Given  um parecer negativo
When   discordo
Then   consigo enviar o documento assim mesmo para revisão humana
And    o documento entra na fila marcado como "enviado apesar do alerta"
And    a IA em nenhum momento bloqueia meu avanço
```

### AC-5: Limite da máquina é explícito
```gherkin
Given  qualquer parecer exibido
When   olho o card
Then   vejo a confiança da análise
And    vejo que é análise automática e que a equipe da Akros ainda vai revisar
```

### AC-6: i18n + impeccable + acessibilidade
```gherkin
Given  o fluxo de análise
When   troco idioma / avalio design / navego por teclado
Then   traduz; o estado de carregamento e o resultado seguem o design system
And    o resultado é anunciado a leitor de tela; reduced-motion é respeitado; impeccable passa
```

## Out of Scope
- A fila e a decisão da equipe (E07-S03).
- Regras específicas de carta de experiência × recomendação (E07-S04).
- Correção automática ou reescrita de documento pela IA — decisão de produto, não limitação.

## Notas de implementação
- O parecer mora no card do documento em `/portal/documentos`, não em modal separado — o cliente
  precisa ver documento e parecer juntos.
- Tom: direto e sem culpa. "Falta a assinatura do emissor" e não "Seu documento foi rejeitado".
- Tratar o estado de erro da análise (motor indisponível): documento segue para a fila humana
  normalmente, com aviso de que a análise automática não rodou.
