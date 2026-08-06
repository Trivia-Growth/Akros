---
name: SPEC
description: Contrato técnico (AC). Escrito por @pm, é o oráculo de teste.
story: E01-S01
alwaysApply: false
---

# SPEC — Bulk Approve Ordens (E01-S01)

[Referência: product.md]

## User Story

Como **Supervisor de Operação**
Quero **selecionar e aprovar múltiplas ordens de serviço de uma vez**
Para que **eu economize tempo diário na aprovação em lote**

## Acceptance Criteria

### AC-1: Seleção de ordens
```gherkin
Given   ordens listadas na tela
When    eu clico no checkbox de uma ordem
Then    a linha fica destacada (bg color)
And     o contador no header muda pra "1 selecionada"
```

### AC-2: Desselecionar tudo
```gherkin
Given   2+ ordens selecionadas
When    eu clico em "Limpar seleção" (botão no header)
Then    todos checkboxes desmarcam
And     contador volta pra "0 selecionadas"
And     botão "Aprovar" fica desabilitado
```

### AC-3: Bulk approve
```gherkin
Given   1+ ordens selecionadas
When    eu clico em "Aprovar" (botão no header)
Then    modal de confirmação abre com lista de ordens
And     eu clico "Confirmar"
Then    backend processa aprovação de cada ordem (RLS garante permissão)
And     status de cada ordem muda pra "Aprovada" na lista
And     toast notifica "5 ordens aprovadas"
And     seleção limpa
```

### AC-4: Erro parcial
```gherkin
Given   5 ordens selecionadas, 4 têm permissão, 1 foi deletada
When    eu aprova as 5
Then    backend aprova as 4, loga erro na 1
And     toast mostra "Aprovadas 4/5 — 1 erro"
And     lista refresca mostrando status de cada uma
```

### AC-5: Proteção contra duplo-clique
```gherkin
Given   bulk approve em andamento
When    usuário clica "Aprovar" novamente durante requisição
Then    botão fica desabilitado com spinner
And     segunda clique é ignorado
And     requisição roda só uma vez
```

## Out of Scope

- Agendamento de aprovações (fora)
- Bulk reject (será outra story)
- Exportar lista de aprovadas (será outra story)

## Assumptions

- Usuário tem permissão RLS pra todas as ordens selecionadas (server valida)
- Status "Aprovada" é idempotente (reapprovar mesma ordem é no-op)
- Limite de ordens em uma aprovação: 100 (não há limite em UI, backend trunca)
