---
name: SPEC
description: Impersonação / seletor de persona + alternância Cliente↔Admin (demo mode).
story: E05-S01
tier: pequeno
---

# SPEC — Impersonação (E05-S01)

## User Story
Como **membro do time da Akros (na demo)**, quero **escolher um cliente e navegar como ele, e alternar
entre visão de cliente e admin**, para que **eu apresente a plataforma em localhost sem login real**.

## Contexto
Sem auth real nesta fase. Consome `useDemoSession` (Zustand — ADR-0003). A persona ativa determina os
dados do portal. Habilita o time a "entrar na pele" de qualquer cliente/cenário.

## Acceptance Criteria

### AC-1: Barra de demo
```gherkin
Given  o app em modo demo (dev)
When   olho o topo/rodapé
Then   vejo uma barra de demo com: seletor de persona (cliente), alternador Cliente↔Admin,
       seletor de cenário (E05-S02) e botão "resetar demo"
```

### AC-2: Impersonar cliente
```gherkin
Given  a barra de demo
When   seleciono uma persona (ex: "Carlos — Fase 2")
Then   o portal (/portal/*) passa a mostrar os dados daquela persona
And    fica visível quem está sendo impersonado
```

### AC-3: Alternar Cliente↔Admin
```gherkin
Given  a barra de demo
When   alterno para "Admin"
Then   navego o painel admin; ao voltar para "Cliente", volto ao portal da persona ativa
```

### AC-4: Consistência de dados
```gherkin
Given  uma ação no admin (ex: liberar fase da persona ativa)
When   troco para a visão do cliente daquela persona
Then   vejo o efeito da ação (mesmo mock db) — ex: fase destravada
```

### AC-5: i18n + impeccable + só em demo
```gherkin
Given  a barra de demo
When   troco idioma
Then   traduz; a barra é discreta/elegante; não aparece fora do modo demo (flag)
```

## Out of Scope
- Autenticação/autorização real. Multiusuário concorrente.

## Notas
- `useDemoSession` guarda persona ativa + papel. Feature `demo`. Flag de ambiente para exibir a barra.
- É o recurso-chave para a apresentação — priorizar cedo (após E00).
