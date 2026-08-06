---
name: SPEC
description: Documentos & Checklists do cliente (upload, consulta, status).
story: E02-S03
tier: pequeno
alwaysApply: false
---

# SPEC — Documentos & Checklists (E02-S03)

## User Story
Como **cliente**, quero **enviar e consultar meus documentos e ver o que falta**, para que **eu cumpra
os requisitos de cada fase**.

## Contexto
Consome `DocumentoRepository` (mock). Documentos ligados a fases (ex: comprobatórios da Fase 1).
Status: pendente · enviado · em análise · aprovado · ajustes. Checklists por fase (ex: Checklist #1).

## Acceptance Criteria

### AC-1: Lista de documentos por fase
```gherkin
Given  /portal/documentos
When   acesso
Then   vejo documentos agrupados por fase com status de cada um
And    vejo o checklist da fase atual com itens pendentes/concluídos
```

### AC-2: Upload (mock)
```gherkin
Given  um documento pendente de uma fase liberada
When   faço upload de um arquivo (mock, ex: PDF)
Then   o status muda para "enviado" e o arquivo aparece listado (persistência em sessão)
And    documentos de fase bloqueada não permitem upload
```

### AC-3: Consulta/preview
```gherkin
Given  um documento enviado
When   clico nele
Then   vejo detalhes (nome, tipo, status, data) e um preview/placeholder
```

### AC-4: Regras de envio visíveis
```gherkin
Given  a área de documentos
When   acesso
Then   vejo as regras reais da Akros (PDF em versão final, traduções certificadas, não aceitar foto/WhatsApp)
```

### AC-5: i18n + impeccable + duplo-envio
```gherkin
Given  o upload
When   troco idioma / envio duas vezes
Then   traduz; segundo envio ignorado durante processamento; impeccable passa
```

## Out of Scope
- Storage/vírus-scan reais. Assinatura (E02-S04).

## Notas
- Upload mock: aceitar arquivo e guardar metadados no store (não persistir binário). Feature `documentos`.
