---
name: SPEC
description: Previsão de conclusão calculada pelo ritmo real do cliente, exibida como faixa e com a base de cálculo aberta.
story: E09-S02
tier: pequeno
alwaysApply: false
---

# SPEC — Previsão pelo ritmo (E09-S02)

## User Story
Como **cliente**, quero **ver quando meu processo deve terminar no ritmo que estou levando**, para
que **eu entenda o custo real de deixar uma pendência parada**.

## Contexto
Pedido direto do Bruno: "previsão baseada no ritmo dele". O valor não está no número — está em
mostrar ao cliente que **o ritmo é uma variável que ele controla**. Uma previsão que só some
quando o cliente some não ensina nada; uma que mostra "cada semana parada empurra 1 semana"
muda comportamento.

## Regra de cálculo (explícita e auditável)
```
tempoRestante = Σ (prazoMedioDiasUteis das etapas pendentes)
                × fatorRitmo(cliente)
                + tempoUSCIS (faixa fixa do programa, não influenciável pelo cliente)

fatorRitmo = mediaDiasRealDoCliente / mediaDiasEsperadoDasEtapasConcluidas
             (limitado a [0.7, 3.0]; = 1.0 enquanto houver menos de 3 etapas concluídas)
```
Exibida sempre como **faixa** (otimista–provável), nunca como data única. Uma data única numa
previsão de imigração é uma promessa que a Akros não pode fazer.

## Acceptance Criteria

### AC-1: Previsão no dashboard do cliente
```gherkin
Given  um cliente com pelo menos 3 etapas concluídas
When   acesso /portal
Then   vejo uma faixa de previsão de conclusão
And    vejo separado o tempo que depende do processo e o tempo que depende da USCIS
```

### AC-2: Base de cálculo é aberta
```gherkin
Given  a previsão exibida
When   peço para entender
Then   vejo o que entra na conta: etapas restantes, meu ritmo e a faixa da USCIS
And    vejo que é estimativa e não compromisso da Akros nem prazo oficial
```

### AC-3: Dados insuficientes não viram chute
```gherkin
Given  um cliente com menos de 3 etapas concluídas
When   acesso o dashboard
Then   vejo a previsão baseada no prazo médio padrão, identificada como tal
And    não vejo um fator de ritmo pessoal calculado sobre amostra pequena
```

### AC-4: Impacto da inércia é visível
```gherkin
Given  uma etapa minha parada há mais de 15 dias
When   olho a previsão
Then   vejo quanto essa pendência específica está empurrando a conclusão
And    vejo o efeito de resolvê-la agora
```

### AC-5: Previsão no lado do admin
```gherkin
Given  a base de clientes
When   o admin olha a lista
Then   consegue ordenar por previsão de conclusão e por fator de ritmo
And    identifica rapidamente quem está fora da curva
```

### AC-6: i18n + impeccable + dataviz
```gherkin
Given  a previsão
When   troco idioma / avalio design
Then   traduz; datas e faixas seguem formatação por locale
And    qualquer gráfico segue a skill dataviz (sem eixo duplo, cor com função); impeccable passa
```

## Out of Scope
- Modelo estatístico sobre histórico de todos os clientes — a fórmula aqui é deliberadamente
  simples e explicável. Modelo preditivo vira decisão própria quando houver base real.
- Prazos oficiais da USCIS puxados de fonte externa.

## Notas de implementação
- Use case puro em `jornada/application/calcular-previsao.ts` — sem I/O, testável direto.
- Depende de E09-S01 (responsável) para separar tempo do cliente e tempo da Akros.
- A fórmula precisa de validação da Akros. Os limites [0.7, 3.0] são um chute razoável e estão
  marcados como tal.
