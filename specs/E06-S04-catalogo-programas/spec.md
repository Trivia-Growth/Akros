---
name: SPEC
description: Catálogo de programas no admin (somente leitura) — fases, documentos exigidos e versão de cada programa.
story: E06-S04
tier: pequeno
alwaysApply: false
---

# SPEC — Catálogo de programas no admin (E06-S04)

## User Story
Como **admin**, quero **ver o catálogo de programas com suas fases e documentos exigidos**, para
que **eu confirme o que o cliente vai receber antes de abrir o caso — e enxergue onde entra um
visto novo**.

## Contexto
Somente leitura nesta rodada (ADR-0004). O valor de demo é mostrar ao Bruno a **estrutura**: os
dois programas lado a lado, com fluxos diferentes, servidos pelo mesmo motor.

## Acceptance Criteria

### AC-1: Lista de programas
```gherkin
Given  o catálogo com "eb2-niw" e "religioso-r-eb4"
When   acesso /admin/programas
Then   vejo os dois com nome, categoria, sujeito, versão, número de fases e de documentos exigidos
And    vejo quantos clientes ativos existem em cada um
```

### AC-2: Detalhe do programa
```gherkin
Given  um programa da lista
When   abro seu detalhe
Then   vejo as fases na ordem, com etapas, prazo médio e responsável de cada etapa
And    vejo os documentos exigidos por fase, com tipo, objetivo, obrigatoriedade e quem emite
```

### AC-3: Comparação lado a lado
```gherkin
Given  dois programas
When   uso a comparação
Then   vejo em que os fluxos divergem (fases, documentos exclusivos de cada um)
And    fica evidente que nenhum código é específico de um programa
```

### AC-4: Leitura, não edição
```gherkin
Given  a tela de catálogo
When   procuro ações de escrita
Then   não existe criar, editar nem excluir programa
And    há uma nota explicando que a edição entra em rodada futura
```

### AC-5: i18n + impeccable
```gherkin
Given  o catálogo
When   troco idioma / avalio design
Then   traduz; densidade de tabela e hierarquia seguem o design system; impeccable passa
```

## Out of Scope
- Qualquer escrita sobre programas.
- Importação/exportação de programa.

## Notas de implementação
- Nova rota `/admin/programas` no `AdminLayout`.
- Consome `ProgramaRepository.listar()`. Nenhuma porta nova.
