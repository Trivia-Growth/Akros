---
name: SPEC
description: Cadência automática de follow-up de lead — sequência de toques que para sozinha quando o lead responde.
story: E11-S03
tier: pequeno
alwaysApply: false
---

# SPEC — Cadência de follow-up (E11-S03)

## User Story
Como **Akros**, quero **que o follow-up de lead aconteça sozinho**, para que **eu pare de perder
lead por esquecimento em vez de por falta de interesse**.

## Contexto
O Bruno foi explícito: **"o maior problema hoje nem é a qualificação, é o follow-up"**. Ele manda
o formulário e o lead some. É aqui que a IA gera mais valor no pré-venda — e não na decisão de
qualificar, que ele quer manter humana.

Os toques que ele mesmo descreveu:
- "Você conseguiu abrir o formulário?"
- "Se preferir, posso fazer as perguntas por aqui mesmo."
- "Posso te ajudar em alguma dúvida antes de continuar?"

Note o padrão: cada toque **oferece uma saída diferente**, não repete a cobrança. É isso que
separa follow-up de perseguição.

## Cadência proposta (a validar)
| Toque | Quando | Conteúdo |
|---|---|---|
| 1 | +1 dia sem resposta | "Conseguiu abrir o formulário?" |
| 2 | +3 dias | "Posso fazer as perguntas por aqui mesmo, se preferir" |
| 3 | +7 dias | "Alguma dúvida antes de continuar?" + conteúdo útil |
| 4 | +14 dias | "Prefere que eu te procure mais para frente?" |
| Encerra | após o toque 4 | Lead vai para a base de reativação (E11-S05) |

## Acceptance Criteria

### AC-1: Cadência dispara e é visível
```gherkin
Given  um lead sem resposta há mais de um dia
When   a cadência roda
Then   o toque é registrado na timeline com autor "Agente IA"
And    o admin vê em que toque cada lead está e quando é o próximo
```

### AC-2: Resposta do lead para a cadência imediatamente
```gherkin
Given  um lead em cadência
When   ele responde qualquer coisa
Then   a cadência é encerrada na hora
And    nenhum toque agendado é enviado depois disso
```

### AC-3: Cada toque oferece uma saída diferente
```gherkin
Given  a sequência de toques
When   leio os quatro
Then   nenhum é uma repetição do anterior
And    cada um oferece um caminho novo: link, conversa, dúvida, adiar
```

### AC-4: Controle humano em cima da automação
```gherkin
Given  um lead em cadência
When   o admin quer intervir
Then   consegue pausar, encerrar ou pular para o próximo toque
And    consegue editar o texto antes do envio de um toque específico
And    consegue desligar a cadência inteira para um lead
```

### AC-5: Limite de insistência
```gherkin
Given  a cadência completa executada sem resposta
When   o último toque passa
Then   nenhum toque novo é gerado
And    o lead entra na base de reativação com o motivo "sem resposta"
```

### AC-6: Não confundir automação com pessoa
```gherkin
Given  um toque enviado pela cadência
When   o lead recebe
Then   fica claro que é a assistente, não uma pessoa da equipe digitando
```

### AC-7: i18n + impeccable
```gherkin
Given  a cadência no admin
When   troco idioma / avalio design
Then   traduz; o estado da cadência é legível de relance; impeccable passa
```

## Out of Scope
- Envio real por WhatsApp/e-mail (nesta fase, evento mock na timeline).
- Otimização de horário de envio por engajamento.
- Cadência para **cliente** com caso aberto — isso é E09-S04.

## Notas de implementação
- Os intervalos são propostas. Confirmar com o Bruno, que conhece o tempo de resposta real.
- AC-6 é ética básica e também é do interesse comercial da Akros: lead que descobre depois que
  "o Bruno" era um bot perde confiança no momento errado.
- AC-2 é a invariante do épico — teste primeiro.
