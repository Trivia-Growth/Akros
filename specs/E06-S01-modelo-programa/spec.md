---
name: SPEC
description: Programa de Visto como dado versionado — entidade, porta e instanciação da jornada.
story: E06-S01
tier: arquitetural
alwaysApply: false
---

# SPEC — Modelo de Programa de Visto (E06-S01)

## User Story
Como **Akros**, quero **que cada tipo de visto seja um dado versionado com sua própria jornada e
seu próprio checklist**, para que **um fluxo novo entre na plataforma sem reescrever código**.

## Contexto
Ver ADR-0004 e `design.md` desta story. Hoje a jornada EB-2 NIW está hardcoded em
`mocks/jornada-template.ts`. Esta story **não muda nada visualmente** — é a fundação de que
E06-S02..S04 dependem, e é a razão de o épico ser arquitetural.

## Acceptance Criteria

### AC-1: Programa existe como dado e é lido por porta
```gherkin
Given  o programa "eb2-niw" na versão 1.0
When   chamo ProgramaRepository.obterPorCodigo("eb2-niw")
Then   recebo um Programa com 6 fasesTemplate (ordem 0..5)
And    com documentosExigidos tipados, cada um ligado a uma faseTemplateId existente
And    nenhum texto de fase é literal — todos são chaves i18n resolvíveis em pt-BR e en
```

### AC-2: Jornada é instanciada a partir do programa
```gherkin
Given  o programa "eb2-niw" e um clienteId
When   executo instanciarJornada(programa, clienteId)
Then   recebo uma Jornada com as mesmas 6 fases, na mesma ordem
And    a fase de ordem 0 nasce "liberada" e todas as demais nascem "bloqueada"
And    a jornada registra programaId e programaVersao
```

### AC-3: Versão congelada — mudar o programa não mexe em caso aberto
```gherkin
Given  um cliente com jornada instanciada de "eb2-niw@1.0"
When   o programa "eb2-niw" passa a ter uma fase a mais na versão 1.1
Then   a jornada do cliente continua com as fases da versão 1.0
And    a jornada continua reportando programaVersao "1.0"
```

### AC-4: Documentos do cliente nascem do catálogo do programa
```gherkin
Given  o programa "eb2-niw" com N requisitos de documento obrigatórios
When   instancio a jornada de um cliente novo
Then   existem N documentos em status "pendente" para esse cliente
And    cada documento aponta para o requisitoId e o tipo que o originou
```

### AC-5: Paridade — o EB-2 NIW atual continua idêntico
```gherkin
Given  o template legado criarFasesTemplate()
When   comparo com a jornada instanciada de "eb2-niw@1.0"
Then   as fases, ordens, títulos, etapas e prazos médios são equivalentes
And    nenhuma tela do portal ou do admin muda de comportamento
```

### AC-6: Regra de dependência preservada
```gherkin
Given  a checagem de arquitetura (dependency-cruiser)
When   rodo pnpm run ci:local
Then   `programas` não importa `jornada` nem `documentos`
And    `jornada/application` é quem conhece `programas`
```

## Out of Scope
- O segundo programa (E06-S02) e a UI de seleção (E06-S03) e de catálogo (E06-S04).
- Editor de programas no admin — fora desta rodada por decisão registrada no ADR-0004.
- Multi-tenant / white-label.

## Notas de implementação
- Novo contexto `features/programas/` com `domain/`, `application/`, `infrastructure/`.
- Novo namespace i18n `programas`.
- `MockProgramaRepository` registrado em `app/di.ts`.
- AC-5 é o gate de segurança da refatoração: escreva o teste de paridade **antes** de remover
  `criarFasesTemplate()`.
