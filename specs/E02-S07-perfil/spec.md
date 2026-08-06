---
name: SPEC
description: Perfil do cliente (dados pessoais, contatos, preferências).
story: E02-S07
tier: trivial
alwaysApply: false
---

# SPEC — Perfil do Cliente (E02-S07)

## User Story
Como **cliente**, quero **ver e editar meus dados**, para que **minhas informações estejam corretas**.

## Acceptance Criteria

### AC-1: Ver dados
```gherkin
Given  /portal/perfil
When   acesso
Then   vejo nome, e-mail, telefone/WhatsApp, tipo de visto, case manager e preferências (idioma)
```

### AC-2: Editar (mock)
```gherkin
Given  o perfil
When   edito um campo e salvo
Then   a alteração persiste na sessão e reflete no restante do portal
```

### AC-3: i18n + impeccable
```gherkin
Given  a tela
When   troco idioma / avalio
Then   traduz; impeccable passa
```

## Out of Scope
- Troca de senha/2FA (sem auth real). Upload de foto real.

## Notas
- Feature `jornada` ou `crm` (dados do cliente). Preferência de idioma integra i18n.
