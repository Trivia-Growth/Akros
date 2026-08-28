---
name: SPEC
description: BYOK por agente (chave OpenRouter + modelo) e integração Whisper obrigatória para transcrever áudio no inbox.
story: E04-S15
tier: pequeno
alwaysApply: false
---

# SPEC — BYOK por agente + Whisper (E04-S15)

## User Story
Como **admin**, quero **que cada agente de IA tenha sua própria chave de API (OpenRouter) e
modelo escolhido**, e **que transcrever áudio no inbox dependa de uma integração Whisper
configurada**, para que **o custo e o comportamento de cada agente sejam isolados, e a
transcrição não pareça mágica sem estar configurada**.

## Contexto
`RegraAtendimentoIA` (E04-S02, mock desde o início) nunca teve chave/modelo — era decisão
consciente ("LLM real / integração OpenRouter" out of scope). Isso continua sendo um protótipo
mockado (nenhuma chamada real acontece); o que muda é a **superfície de configuração** existir,
seguindo o mesmo padrão de segredo mascarado já usado em `IntegracaoExterna`.

## Acceptance Criteria

### AC-1: Cada agente tem seu próprio modelo/chave
```gherkin
Given /admin/comunicacao, aba Agente IA, um agente selecionado
When vejo o card "Modelo de IA (LLM)"
Then escolho o modelo (catálogo OpenRouter) e colo uma chave de API
And salvar não afeta o modelo/chave de nenhum outro agente
```

### AC-2: Chave nunca aparece em claro
```gherkin
Given uma chave já configurada
When reabro o agente
Then vejo só "Chave atual •••• XXXX" — mesma regra de segredo mascarado do resto de Configurações
```

### AC-3: Sem chave, aviso explícito
```gherkin
Given um agente sem chave configurada
When abro o card do modelo
Then vejo o aviso de que esse agente responde só pela simulação mockada, não por um modelo real
```

### AC-4: Transcrever áudio exige Whisper ativo
```gherkin
Given uma mensagem de áudio no inbox
When a integração Whisper (Configurações → categoria transcrição) está inativa
Then o botão "Transcrever áudio" vira um link pra ativar Whisper em Configurações
And com Whisper ativo, o botão volta a transcrever normalmente
```

### AC-5: Regressão corrigida — contas de agenda do agente Ana
```gherkin
Given o rename de ContaAgendaConectada → ContaConectada (E04-S12) trocou os ids das fixtures
When abro a Ferramenta de agendamento do agente Ana
Then as contas Google (Natalia) e Calendly aparecem marcadas como antes — não em branco
```

## Out of Scope
- Chamada real à API OpenRouter/Whisper — continua mock (protótipo visual, sem backend).
- Custo por token real por modelo (Token Guard) — fora desta rodada.

## Notas de implementação
- AC-5 é fix de regressão introduzida na story anterior — fixture `mocks/agente-ia.ts` tinha
  `contasAgendaIds` com os ids antigos (`agenda-google-natalia`), atualizados pra
  `conta-google-natalia`/`conta-calendly-atendimento`.
- Whisper vive como mais um item de `IntegracaoExterna` (categoria `"transcricao"`, junto de
  Fireflies/Teams) — reaproveita o modal de credencial mascarada que já existe, zero UI nova ali.
