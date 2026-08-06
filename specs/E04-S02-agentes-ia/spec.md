---
name: SPEC
description: Agentes IA — config de primeiro atendimento + preview de conversa (mock).
story: E04-S02
tier: pequeno
---

# SPEC — Agentes IA (E04-S02)

## User Story
Como **admin**, quero **configurar um agente de IA que faz o primeiro atendimento e tira dúvidas em
horários específicos**, para que **leads sejam atendidos rápido mesmo fora do horário da equipe**.

## Contexto
Consome `AgenteService` (mock — ADR-0002). O agente atua no inbox WhatsApp (E04-S01): responde
automaticamente conforme regras (horário, tópicos). Nesta fase é **configuração + simulação**, sem
LLM real. Mensagens do agente aparecem como autor `agente_ia` nas conversas.

## Acceptance Criteria

### AC-1: Configuração do agente
```gherkin
Given  /admin/comunicacao/agentes (ou aba dentro de comunicação)
When   acesso
Then   vejo a config do agente: nome/persona, saudação, horários de atuação (janelas),
       tópicos que responde, e a regra de handoff para humano (quando escalar)
And    posso editar e salvar (persistência em sessão)
```

### AC-2: Regras de atendimento (horários)
```gherkin
Given  janelas de horário configuradas
When   defino que o agente atua fora do horário comercial
Then   a config reflete quando o agente responde vs quando encaminha para humano
```

### AC-3: Preview / simulação de conversa
```gherkin
Given  o agente configurado
When   uso o preview (chat de teste) e envio uma dúvida comum (ex: "quanto custa o EB-2 NIW?")
Then   vejo a resposta simulada do agente conforme os tópicos configurados
And    ao pedir algo fora do escopo, vejo o handoff simulado ("encaminhando para um especialista")
```

### AC-4: Integração com o inbox
```gherkin
Given  uma conversa nova no inbox (E04-S01) dentro da janela do agente
When   abro a thread
Then   vejo a primeira resposta do agente (autor "agente_ia") já registrada
And    fica visível que foi atendimento por IA (badge)
```

### AC-5: i18n + impeccable
```gherkin
Given  as telas do agente
When   troco idioma / avalio
Then   traduz; impeccable passa
```

## Out of Scope
- LLM real / integração OpenRouter. Treinamento/base de conhecimento real. Métricas de qualidade do agente.
- Defesa contra prompt injection (relevante só na fase com LLM real — ver `ia/` e `@prompt-engineer`).

## Notas de implementação
- Respostas simuladas: banco de Q&A mock por tópico em `src/mocks/`. Feature `comunicacao`.
- Handoff = marca a conversa para atendimento humano (muda estado; aparece no inbox).
- Quando virar LLM real: envolver `@prompt-engineer` (evals, versionamento, OWASP LLM Top 10). Aqui é só UX/mock.
