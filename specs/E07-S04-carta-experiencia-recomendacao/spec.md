---
name: SPEC
description: Regras de distinção entre carta de experiência, carta de recomendação e documentos sem valor imigratório.
story: E07-S04
tier: pequeno
alwaysApply: false
---

# SPEC — Carta de experiência × carta de recomendação (E07-S04)

## User Story
Como **cliente**, quero **que o sistema perceba quando eu confundi carta de experiência com carta
de recomendação**, para que **eu não descubra o erro depois de pedir o documento errado para o
meu ex-chefe**.

## Contexto
Este é o caso concreto que a Akros usou para explicar o pedido, e é o **cenário de demonstração**
do épico E07. As três confusões reais:

| Documento | Serve para | Erro comum |
|---|---|---|
| **Carta de experiência** | Comprovar tempo de trabalho e responsabilidades | Vem sem assinatura, sem papel timbrado, sem período, ou assinada por um colega em vez da empresa |
| **Carta de recomendação** | Terceiro atesta a **qualidade** do trabalho | Enviada no lugar da carta de experiência |
| **Carteira de trabalho (CTPS)** | Nada, para fins de imigração americana | Cliente manda achando que substitui a carta de experiência |

## Regras de validação (motor mock, determinístico)

**Carta de experiência — impeditivo se faltar:**
emissor é a empresa (não pessoa física isolada) · período de início e fim · cargo · descrição de
responsabilidades · assinatura do responsável · dado de contato do emissor.
**Ressalva:** sem papel timbrado; sem tradução certificada quando em português.

**Carta de recomendação — impeditivo se faltar:**
identificação e credencial do recomendante · relação com o candidato · avaliação qualitativa
concreta (não genérica) · assinatura.
**Ressalva:** texto genérico/modelo, sem exemplo específico do trabalho.

**CTPS ou equivalente:** `tipo_incorreto`, com explicação de que não tem valor imigratório e do
que pedir no lugar.

## Acceptance Criteria

### AC-1: Troca entre os dois tipos é detectada
```gherkin
Given  um requisito de carta de experiência
When   envio uma carta de recomendação
Then   a aderência é "tipo_incorreto"
And    vejo a diferença entre os dois documentos em uma frase
And    vejo que a carta de recomendação serve ao requisito X do meu checklist
```

### AC-2: Carta de experiência incompleta lista o que falta
```gherkin
Given  uma carta de experiência sem assinatura e sem período
When   a análise conclui
Then   vejo duas lacunas impeditivas nomeadas
And    vejo um texto pronto para eu encaminhar ao RH da empresa pedindo a correção
```

### AC-3: Documento sem valor imigratório é explicado, não só rejeitado
```gherkin
Given  que envio uma carteira de trabalho
When   a análise conclui
Then   a aderência é "tipo_incorreto"
And    vejo por que a CTPS não tem valor para a imigração americana
And    vejo exatamente o que pedir no lugar
```

### AC-4: Ressalva não bloqueia
```gherkin
Given  uma carta de experiência completa, porém sem papel timbrado
When   a análise conclui
Then   a aderência é "atende_com_ressalva"
And    o documento segue para a fila humana normalmente
And    a ressalva aparece para o revisor
```

### AC-5: Cenário de demo dedicado
```gherkin
Given  a barra de demo (E05)
When   escolho o cenário "Documento errado"
Then   assumo um cliente com uma carta de recomendação enviada no lugar da carta de experiência
And    consigo demonstrar o ciclo completo: parecer, correção, reenvio, aprovação humana
```

### AC-6: i18n
```gherkin
Given  as mensagens de lacuna e sugestão
When   troco o idioma
Then   todas traduzem, incluindo o texto pronto para encaminhar ao RH
```

## Out of Scope
- OCR e leitura real de PDF (o motor mock trabalha sobre metadados declarados na fixture).
- Regras dos documentos institucionais do programa religioso — mesma mecânica, story própria.

## Notas de implementação
- As regras acima precisam de **revisão da Natalia** antes de virarem texto de cliente. Marcar as
  chaves i18n como pendentes de validação no PR.
- O "texto pronto para encaminhar ao RH" (AC-2) é o detalhe que transforma um alerta em ajuda —
  não corte na implementação por ser trabalhoso.
