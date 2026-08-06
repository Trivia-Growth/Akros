---
name: SPEC
description: Gestão de jornada pelo admin (liberar fases — o gate da gamificação).
story: E03-S03
tier: pequeno
---

# SPEC — Gestão de Jornada (E03-S03)

## User Story
Como **admin/case manager**, quero **liberar as fases da jornada de cada cliente**, para que **o
cliente só avance quando a etapa anterior estiver concluída** (o gate da gamificação).

## Contexto
Consome `JornadaRepository.liberarFase`. É o **outro lado** da E02-S02: aqui o admin controla o unlock.
Regra: liberar fase N+1 muda seu status de `bloqueada`→`liberada` no portal do cliente.

## Acceptance Criteria

### AC-1: Ver progresso do cliente
```gherkin
Given  /admin/jornadas (ou aba Jornada no 360)
When   seleciono um cliente
Then   vejo suas 6 fases com status e progresso de etapas
```

### AC-2: Liberar próxima fase
```gherkin
Given  a fase atual do cliente está concluída e a próxima está bloqueada
When   clico em "Liberar próxima fase"
Then   a próxima fase muda para "liberada"
And    (no mesmo mock db) o portal do cliente passa a permitir agir nessa fase
```

### AC-3: Bloqueio quando fase não concluída
```gherkin
Given  a fase atual do cliente NÃO está concluída
When   tento liberar a próxima
Then   sou avisado que a fase atual precisa concluir (ou confirmo override explícito)
```

### AC-4: Registro no histórico
```gherkin
Given  uma liberação de fase
When   ela ocorre
Then  aparece no histórico de contato do cliente (timeline da visão 360)
And    (opcional) gera um aviso no dashboard do cliente
```

### AC-5: i18n + impeccable
```gherkin
Given  a tela
When   troco idioma / avalio
Then   traduz; impeccable passa
```

## Out of Scope
- Notificações reais (e-mail/WhatsApp) — mock/aviso interno basta.

## Notas
- Este é o **gate central** da gamificação (ADR/E00-S04). Feature `crm` chamando porta de `jornada`.
- Demonstração ideal na demo: liberar fase no admin e mostrar o portal do cliente destravando.
