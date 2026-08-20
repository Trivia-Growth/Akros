---
name: SPEC
description: Simplifica config do agente — remove Skills/MCPs, adiciona correções explícitas e UI de horários de atendimento.
story: E04-S09
tier: pequeno
alwaysApply: false
---

# SPEC — Agente simplificado (E04-S09)

## User Story
Como **admin**, quero **configurar o agente com um prompt de instruções simples, corrigir
comportamentos indesejados de forma explícita, e definir os horários em que ele responde**, em vez
de mexer em listas técnicas de "Skills" e "MCPs" que não fazem sentido pra operação.

## Contexto
Hoje `RegraAtendimentoIA` tem `skills: SkillAgente[]` e `mcps: ConectorMCP[]`, ambos renderizados
como listas de checkbox técnicas em `/admin/comunicacao` → Agente IA. O campo `alma` já é, na
prática, um prompt de instruções livre (tom, limites, condução da conversa) — vira o lugar único
pra isso, incluindo quando consultar cada base de conhecimento (E04-S10). `janelasAtendimento`
já existe no domínio mas nunca teve UI.

## Acceptance Criteria

### AC-1: Skills e MCPs removidos
```gherkin
Given /admin/comunicacao, aba Agente IA
When  vejo a configuração do agente
Then  não existem mais os cards "Skills" e "MCPs" — só "Alma e comportamento" com o prompt
```

### AC-2: Alma orienta sobre bases de conhecimento
```gherkin
Given o campo "Alma do agente"
When  vejo a dica abaixo do campo
Then  a dica menciona explicitamente incluir instruções de quando consultar cada base de
      conhecimento disponível
```

### AC-3: Memória continua funcionando
```gherkin
Given a configuração de memória do agente (escopo, retenção, campos)
When  a tela é reorganizada
Then  a funcionalidade de memória continua editável, só muda de lugar (card próprio)
```

### AC-4: Correções
```gherkin
Given /admin/comunicacao, aba Agente IA, um agente selecionado
When  vejo o card "Correções"
Then  vejo a lista de correções já registradas (texto + data) e um campo pra adicionar uma nova
And   ao adicionar, ela entra na lista com a data atual e persiste ao salvar o agente
```

### AC-5: Horários de atendimento editáveis
```gherkin
Given o card "Horários de atendimento"
When  vejo a configuração
Then  vejo a lista de janelas (início/fim) já configuradas, com opção de adicionar/remover janela
And   salvar o agente persiste as janelas alteradas
```

## Out of Scope
- Aplicar de fato os horários (bloquear resposta fora da janela) — já não era feito antes, continua
  só informativo/configuração.
- Migrar `topicos`/simulação de conversa — não mexido.

## Notas de implementação
- `comunicacao/domain/types.ts`: remove `SkillAgente`, `ConectorMCP`,
  `RegraAtendimentoIA.skills`, `.mcps`. Adiciona `CorrecaoAgente { id; texto; registradoEm }` e
  `RegraAtendimentoIA.correcoes: CorrecaoAgente[]`.
- `mocks/agente-ia.ts`: remove `skills`/`mcps` dos 2 agentes seed, adiciona `correcoes: []` (ou 1
  exemplo pra prova visual).
- `ComunicacaoPage.tsx` (`AgentConfig`): remove cards Skills/MCPs; Memória em card próprio; card
  novo Correções (textarea + lista); card novo Horários (lista dinâmica início/fim, mesmo padrão
  de itens dinâmicos já usado em `PropostasPage.tsx`).
