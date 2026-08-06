---
name: SPEC
description: Base de clientes + Visão 360.
story: E03-S02
tier: pequeno
alwaysApply: false
---

# SPEC — Base de Clientes + Visão 360 (E03-S02)

## User Story
Como **admin**, quero **uma base de clientes e uma visão 360 de cada um**, para que **eu tenha todo o
contexto ao atender**.

## Contexto
Consome `ClienteRepository` + agregações de `jornada`, `documentos`, `pagamentos`, `agenda`,
`comunicacao`, `crm`. Visão 360 = tudo sobre o cliente num só lugar.

## Acceptance Criteria

### AC-1: Lista de clientes
```gherkin
Given  /admin/clientes
When   acesso
Then   vejo a lista (nome, tipo de visto, fase atual, case manager, status/saúde do caso)
And    posso buscar/filtrar
```

### AC-2: Visão 360 do cliente
```gherkin
Given  um cliente
When   abro seu perfil 360
Then   vejo abas/seções: Dados, Jornada (fase/progresso), Documentos, Pagamentos, Reuniões,
       Conversas (WhatsApp), Transcrições, Histórico de contato
And    cada seção reflete os dados mockados do cliente
```

### AC-3: Histórico de contato (timeline)
```gherkin
Given  a visão 360
When   olho o histórico
Then   vejo uma timeline de interações (e-mail, WhatsApp, reunião, mudança de fase) ordenada
```

### AC-4: Atalho para gestão de jornada
```gherkin
Given  a visão 360
When   estou na aba Jornada
Then   vejo o progresso e um atalho para "liberar próxima fase" (E03-S03)
```

### AC-5: i18n + impeccable
```gherkin
Given  a tela
When   troco idioma / avalio
Then   traduz; densa mas legível; impeccable passa
```

## Out of Scope
- Edição profunda de cada entidade a partir do 360 (links para telas específicas bastam).

## Notas
- "Saúde do caso" (semáforo em dia/atenção/atrasado) é bem-vindo. Feature `crm` agregando as demais via portas.
