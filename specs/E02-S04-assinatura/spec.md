---
name: SPEC
description: Assinatura digital de documentos (fluxo mockado).
story: E02-S04
tier: pequeno
alwaysApply: false
---

# SPEC — Assinatura Digital (E02-S04)

## User Story
Como **cliente**, quero **assinar documentos digitalmente (ex: contrato)**, para que **eu formalize
etapas sem papel**.

## Contexto
Consome `AssinaturaService` (mock). Primeiro uso: contrato de prestação de serviços na Fase 1.
Status da solicitação: aguardando · assinado.

## Acceptance Criteria

### AC-1: Solicitação de assinatura visível
```gherkin
Given  um documento que requer assinatura (ex: contrato)
When   acesso a jornada/documentos
Then   vejo a solicitação de assinatura com status "aguardando"
```

### AC-2: Fluxo de assinatura (mock)
```gherkin
Given  uma solicitação aguardando
When   abro e confirmo a assinatura (ex: desenhar/tipar nome + aceite)
Then   o status muda para "assinado" com data/hora
And    o documento associado reflete o novo status
And    o progresso da fase avança se a assinatura era uma etapa
```

### AC-3: Registro de aceite
```gherkin
Given  uma assinatura concluída
When   consulto o documento
Then   vejo evidência (nome, data/hora, aceite) — mock de trilha de auditoria
```

### AC-4: i18n + impeccable + idempotência
```gherkin
Given  o fluxo de assinatura
When   troco idioma / tento assinar duas vezes
Then   traduz; reassinar é no-op; impeccable passa
```

## Out of Scope
- Assinatura com validade jurídica / certificado ICP. Integração DocuSign real.

## Notas
- Mock: capturar nome/aceite e marcar `SolicitacaoAssinatura.status=assinado`. Feature `documentos`.
