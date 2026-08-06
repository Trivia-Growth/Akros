---
name: SPEC
description: Transcrições de reuniões (Fireflies) como evidência, anexadas à visão 360.
story: E04-S04
tier: pequeno
alwaysApply: false
---

# SPEC — Transcrições Fireflies (E04-S04)

## User Story
Como **admin/case manager**, quero **acessar as transcrições das reuniões**, para que **eu tenha
registro/evidência do que foi combinado com o cliente**.

## Contexto
Consome `TranscricaoRepository` (mock — ADR-0002). Fonte: Fireflies. Cada transcrição liga a uma
reunião (E04-S03/E02-S06) e a um cliente. Vira **evidência** anexada à visão 360 (E03-S02).

## Acceptance Criteria

### AC-1: Lista de transcrições
```gherkin
Given  /admin/transcricoes (ou aba em comunicação/agenda)
When   acesso
Then   vejo as transcrições (reunião, cliente, data, duração, resumo curto)
And    posso buscar por cliente/reunião
```

### AC-2: Detalhe da transcrição
```gherkin
Given  uma transcrição
When   abro
Then   vejo o texto completo (mock), resumo/pontos-chave e action items
And    vejo o link para a reunião de origem e para o cliente
```

### AC-3: Evidência na visão 360
```gherkin
Given  um cliente com reunião transcrita
When   abro sua visão 360 (E03-S02) na aba Transcrições
Then   a transcrição aparece como evidência anexada
And    consta na timeline do histórico de contato
```

### AC-4: Status de captura (mock)
```gherkin
Given  uma reunião passada elegível
When   olho seu detalhe (E04-S03)
Then   vejo o status da transcrição (capturada / processando / indisponível) — simulado
```

### AC-5: i18n + impeccable
```gherkin
Given  as telas de transcrição
When   troco idioma / avalio
Then   traduz; texto longo legível (tipografia impeccable); passa
```

## Out of Scope
- Integração real Fireflies / captura real de áudio. Diarização real. Edição da transcrição.

## Notas de implementação
- Transcrições mock em `src/mocks/` ligadas às reuniões das personas. Feature `agenda` ou `comunicacao`.
- Resumo/action items são campos mock (não geração real). Tratar como evidência read-only.
