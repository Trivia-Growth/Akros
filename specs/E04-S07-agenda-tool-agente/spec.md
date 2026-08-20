---
name: SPEC
description: Contas de agenda conectadas (Google/Microsoft/Calendly) + tool de agendamento do agente de IA — marca reunião direto na conversa (ADR-0007).
story: E04-S07
tier: arquitetural
alwaysApply: false
---

# SPEC — Tool de agenda do agente (E04-S07)

## User Story
Como **admin**, quero **conectar contas de calendário (Google, Microsoft, Calendly) e dar ao agente
de IA a capacidade de marcar reunião direto na conversa**, para que **leads e clientes consigam
fechar um horário sem esperar um humano disponível**.

## Contexto
Ver `design.md` (contrato de dados) e ADR-0007 (por que isso é uma exceção consciente ao princípio
de humano no loop, e onde ficam os limites dela). O gate humano de E11-S04 (qualificação de lead)
**não muda** — esta é uma capacidade nova e separada, disponível em qualquer conversa do inbox
(`comunicacao`), condicionada a duas autorizações humanas explícitas (conectar conta + ativar tool).

## Acceptance Criteria

### AC-1: Conectar conta de agenda
```gherkin
Given /admin/configuracoes, seção "Contas de agenda conectadas"
When  clico em "Conectar conta" e escolho um provedor (Google, Microsoft ou Calendly)
Then  vejo o formulário específico daquele provedor (campos de credencial mascarados após salvos)
And   ao salvar, a conta aparece na lista como ativa, com nome de exibição e provedor
```

### AC-2: Múltiplas contas, inclusive do mesmo provedor
```gherkin
Given a seção de contas de agenda
When  conecto uma segunda conta do mesmo provedor (ex: 2 contas Google)
Then  ambas aparecem na lista, cada uma com seu próprio nome de exibição, independentes
```

### AC-3: Desconectar conta
```gherkin
Given uma conta de agenda conectada
When  clico em "Desconectar"
Then  ela sai da lista e deixa de estar disponível para seleção na ferramenta de agendamento de
      qualquer agente
```

### AC-4: Ativar a ferramenta no agente
```gherkin
Given /admin/comunicacao, aba Agente IA, agente selecionado
When  vejo o card "Ferramenta de agendamento"
Then  vejo um toggle pra ativar/desativar, e checkboxes de todas as contas de agenda ativas
      (de qualquer provedor) pra escolher quais esse agente pode usar
And   sem nenhuma conta conectada, vejo um estado vazio apontando pra /admin/configuracoes
And   "Salvar agente" persiste a escolha (mesmo fluxo de salvarAgenteIA já existente)
```

### AC-5: Conversa simulada — agente marca a reunião
```gherkin
Given um agente com a ferramenta de agendamento ativa e ao menos 1 conta selecionada
When  abro o inbox e vejo a conversa de exemplo do agendamento
Then  vejo o diálogo completo: cliente pede reunião, agente pergunta dia/período, agente confirma
      disponibilidade, cliente escolhe, agente confirma o agendamento e diz qual calendário usou
```

### AC-6: Reunião criada é rastreável
```gherkin
Given a conversa de exemplo do AC-5
When  vejo /admin/agenda (todas as reuniões)
Then  existe uma Reuniao correspondente com criadaPor = "agente_ia", canal mapeado do provedor da
      conta usada, e ela aparece distinguível das reuniões criadas por cliente/admin
```

### AC-7: Gate de E11-S04 continua intacto
```gherkin
Given o fluxo de qualificação de lead no kanban (E11-S04)
When  um lead passa pelo gate de agendamento
Then  o comportamento é exatamente o mesmo de antes desta story — aprovação humana continua
      obrigatória nesse fluxo específico, sem relação com a tool de agendamento do agente
```

## Out of Scope
- OAuth real, chamada real às APIs de Google Calendar / Microsoft Graph / Calendly.
- Cancelamento/reagendamento da reunião pelo agente após criada.
- Notificação automática ao humano responsável logo após a criação (registrado em ADR-0007 como
  mitigação futura).
- Mudar o gate de E11-S04 — permanece como está.
- i18n do card "Ferramenta de agendamento" e do formulário de conexão — segue o padrão hardcoded em
  PT-BR já usado em `AgentConfig`/`ConfiguracoesPage.tsx` (débito pré-existente).

## Notas de implementação
Ver seção "Store / mocks" do `design.md` para os arquivos e nomes exatos de tipos/actions.
