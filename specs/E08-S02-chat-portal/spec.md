---
name: SPEC
description: Chat dentro do portal do cliente — canal registrável, com anexo ligado ao checklist.
story: E08-S02
tier: pequeno
alwaysApply: false
---

# SPEC — Chat no portal do cliente (E08-S02)

## User Story
Como **cliente**, quero **falar com a Akros dentro do portal**, para que **a conversa fique junto
do meu processo e eu não precise procurar no WhatsApp o que me pediram**.

## Contexto
O lado "registrável" do híbrido do ADR-0006. O WhatsApp continua existindo e continua sendo a
porta de entrada — o chat do portal não compete com ele, tem outro papel: é onde documento,
decisão e aprovação formal acontecem, com registro que ninguém apaga.

Para o cliente adotar, o chat precisa oferecer algo que o WhatsApp não oferece: **contexto**. Uma
mensagem sobre um documento aparece ligada àquele documento.

## Acceptance Criteria

### AC-1: Conversar com contexto do processo
```gherkin
Given  um cliente no portal
When   abro o chat
Then   vejo a conversa com a equipe da Akros, mais recente por último
And    vejo quem é o meu case manager, com nome e foto
And    cada mensagem mostra autor e horário
```

### AC-2: Mensagem ancorada em documento ou fase
```gherkin
Given  um documento com pedido de ajuste
When   abro o chat a partir desse documento
Then   a conversa abre com o documento referenciado na composição da mensagem
And    a mensagem enviada fica visivelmente ligada a esse documento na timeline
```

### AC-3: Anexo entra pelo caminho certo
```gherkin
Given  que anexo um arquivo no chat
When   envio
Then   sou perguntado a qual item do checklist ele corresponde
And    ao escolher, o arquivo entra como documento daquele requisito e dispara a análise (E07-S02)
And    se não corresponder a nenhum, entra como anexo avulso na timeline
```

### AC-4: Tudo cai na timeline única
```gherkin
Given  mensagens trocadas no chat
When   o admin abre a visão 360 do cliente
Then   as mensagens aparecem na timeline com canal "chat_portal"
And    intercaladas em ordem cronológica com WhatsApp, e-mail e reuniões
```

### AC-5: Expectativa de resposta é explícita
```gherkin
Given  o chat
When   envio uma mensagem fora do horário de atendimento
Then   vejo o prazo de resposta esperado
And    se o agente de IA responder (E04-S02), ele se identifica como automático
```

### AC-6: Não apagável
```gherkin
Given  uma mensagem já enviada
When   procuro apagar
Then   não existe essa ação
And    a interface deixa claro que a conversa faz parte do registro do processo
```

### AC-7: i18n + impeccable + acessibilidade
```gherkin
Given  o chat
When   troco idioma / navego por teclado / uso leitor de tela
Then   traduz; mensagem nova é anunciada; foco não é sequestrado; impeccable passa
```

## Out of Scope
- Chamada de voz/vídeo.
- App mobile nativo (o portal é responsivo; app é outra decisão).
- Notificação push real.

## Notas de implementação
- Nova rota `/portal/mensagens` + ponto de entrada contextual a partir de documento e fase.
- Escreve `EventoComunicacao` de canal `chat_portal` (E08-S01).
- AC-6 é o argumento da Natalia virando produto: não apagável, e dito na interface.
