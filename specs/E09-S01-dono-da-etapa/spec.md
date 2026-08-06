---
name: SPEC
description: Cada etapa tem um responsável (cliente, Akros ou terceiro) e o portal mostra de quem é a bola agora.
story: E09-S01
tier: pequeno
alwaysApply: false
---

# SPEC — Dono da etapa (E09-S01)

## User Story
Como **cliente**, quero **saber se o processo está parado por mim ou pela Akros**, para que
**eu não cobre o que não depende de mim nem deixe parado o que depende**.

## Contexto
O Bruno descreveu os dois lados do mesmo problema: cliente que paga e some por meses, e cliente
que acelera uma parte enquanto a demora está justamente no que depende dele. Ambos são casos de
**responsabilidade invisível**.

Esta é a story-base do épico E09 — E09-S02, S03 e S04 dependem do campo que ela introduz.

## Modelo
```ts
type ResponsavelEtapa = "cliente" | "akros" | "terceiro" | "uscis";
```
`terceiro` cobre recomendante, avaliador educacional, tradutor e empresa emissora de carta —
casos em que **nenhum dos dois lados** pode agir sozinho, e que hoje são cobrados da pessoa errada.

## Acceptance Criteria

### AC-1: Toda etapa tem responsável
```gherkin
Given  o template de qualquer programa (E06)
When   listo as etapas
Then   cada uma declara um responsavel
And    nenhuma etapa fica sem responsável definido
```

### AC-2: "De quem é a bola" no dashboard do cliente
```gherkin
Given  um cliente com etapas pendentes de lados diferentes
When   acesso /portal
Then   vejo separado o que está comigo e o que está com a Akros ou com terceiros
And    o que está comigo aparece primeiro, com a ação concreta ao lado
```

### AC-3: Etapa de terceiro nomeia o terceiro
```gherkin
Given  uma etapa de responsabilidade "terceiro"
When   olho o detalhe
Then   vejo quem é o terceiro esperado (recomendante, avaliador, tradutor, empresa)
And    vejo o que eu posso fazer para destravar, se houver algo
```

### AC-4: Tempo parado é contado por lado
```gherkin
Given  uma etapa pendente há N dias
When   olho a etapa
Then   vejo há quanto tempo ela está parada
And    o tempo é atribuído ao responsável atual, não ao processo em geral
```

### AC-5: Sem culpabilizar
```gherkin
Given  uma etapa parada há muito tempo do lado do cliente
When   o cliente vê a informação
Then   o texto informa e oferece o próximo passo
And    não usa linguagem de cobrança ou de atraso pessoal
```

### AC-6: i18n + impeccable + acessibilidade
```gherkin
Given  a marcação de responsável
When   troco idioma / avalio design
Then   traduz; o responsável é indicado por rótulo, não só por cor; impeccable passa
```

## Out of Scope
- Previsão de conclusão (E09-S02), painel de gargalos (E09-S03), alertas (E09-S04).
- Notificação ativa (e-mail/push).

## Notas de implementação
- `responsavel` entra em `EtapaTemplate` (E06-S01) e é copiado para `Etapa` na instanciação.
- AC-5 não é detalhe de copy: o cliente de imigração já está ansioso, e uma tela que o culpa faz
  ele **sumir mais**, que é exatamente o problema que estamos resolvendo.
