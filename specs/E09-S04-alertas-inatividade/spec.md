---
name: SPEC
description: Alertas de cliente inativo e de material vencido (Business Plan, documentos com validade) antes de virar retrabalho.
story: E09-S04
tier: pequeno
alwaysApply: false
---

# SPEC — Alertas de inatividade e material vencido (E09-S04)

## User Story
Como **Akros**, quero **ser avisada antes de um cliente sumido virar retrabalho**, para que
**Business Plan e documentos não vençam esperando alguém lembrar**.

## Contexto
Caso descrito pelo Bruno: cliente paga tudo, some por meses, volta — e o Business Plan e os
documentos já estão desatualizados. O prejuízo é de horas da equipe e de credibilidade com o
cliente. O sinal existe muito antes do dano; hoje ninguém está olhando.

## Regras de alerta (limiares a validar com a Akros)
| Alerta | Gatilho proposto |
|---|---|
| **Cliente inativo** | sem nenhum evento de comunicação de entrada há 21 dias, com etapa pendente do lado dele |
| **Cliente dormente** | sem atividade há 60 dias |
| **Material perto de vencer** | documento com validade a menos de 30 dias do fim |
| **Material vencido** | validade expirada, ou Business Plan com mais de 12 meses e caso ainda não enviado |
| **Etapa travada** | etapa parada além de 3× o prazo médio dela |

## Acceptance Criteria

### AC-1: Central de alertas no admin
```gherkin
Given  casos que disparam alertas
When   acesso a central de alertas
Then   vejo cada alerta com cliente, tipo, gatilho e há quanto tempo está aberto
And    consigo filtrar por tipo, por programa e por case manager
And    consigo marcar um alerta como tratado, com nota e autor
```

### AC-2: Alerta aparece onde o trabalho acontece
```gherkin
Given  um cliente com alerta aberto
When   abro a visão 360 desse cliente ou a lista de clientes
Then   o alerta é visível ali também, não só na central
```

### AC-3: Documento com validade
```gherkin
Given  documentos que têm prazo de validade
When   a validade se aproxima ou expira
Then   o alerta correspondente é gerado
And    o cliente também vê, no portal, que aquele documento precisará ser renovado
```

### AC-4: Alerta não vira ruído
```gherkin
Given  um alerta já tratado
When   a condição persiste
Then   ele não é recriado imediatamente — respeita um período de silêncio
And    a central mostra alertas abertos e tratados separados
```

### AC-5: O cliente é avisado antes do dano, sem cobrança
```gherkin
Given  um cliente inativo com pendência do lado dele
When   o sistema comunica
Then   a mensagem lembra o que está pendente e o efeito na previsão
And    oferece ajuda, sem tom de cobrança
And    a mensagem é registrada na timeline (E08-S01)
```

### AC-6: i18n + impeccable
```gherkin
Given  os alertas
When   troco idioma / avalio design
Then   traduz; severidade usa a paleta de status reservada, com ícone e rótulo
And    nunca só cor; impeccable passa
```

## Out of Scope
- Envio real de e-mail/WhatsApp (nesta fase, o alerta gera evento mock na timeline).
- Cadência de follow-up de **lead** — isso é E11-S03; aqui o alvo é cliente com caso aberto.

## Notas de implementação
- Os limiares da tabela são propostas. Confirmar com a Akros antes de congelar.
- Alerta é derivado do estado, não um registro que precisa ser criado por processo agendado —
  nesta fase, calculado na leitura.
