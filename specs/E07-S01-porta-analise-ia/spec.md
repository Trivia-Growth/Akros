---
name: SPEC
description: Contrato de análise de documento por IA — tipos tipados, porta, parecer separado da decisão humana.
story: E07-S01
tier: arquitetural
alwaysApply: false
---

# SPEC — Porta de análise de documento por IA (E07-S01)

## User Story
Como **Akros**, quero **um contrato único de análise de documento por IA**, para que **o parecer
automático nunca se confunda com a decisão da equipe e o motor possa ser trocado sem tocar a UI**.

## Contexto
Ver ADR-0005 e `design.md` desta story. Fundação de E07-S02..S04.

## Acceptance Criteria

### AC-1: Tipo de documento deixa de ser texto livre
```gherkin
Given  o modelo de Documento
When   verifico o campo tipo
Then   ele é um TipoDocumento tipado, não string
And    todo documento das fixtures usa um tipo válido do catálogo do programa (E06)
```

### AC-2: Porta devolve parecer completo
```gherkin
Given  um documento enviado e o requisito que ele deveria atender
When   chamo AnalisadorDocumentoPort.analisar
Then   recebo tipoDetectado, tipoEsperado, aderencia, confianca, lacunas e sugestoes
And    recebo o identificador do motor que produziu o parecer
```

### AC-3: A IA não muda o status do documento
```gherkin
Given  um documento em "em_analise" com parecer de aderencia "atende" e confianca 0.98
When   a análise termina
Then   o status do documento continua "em_analise"
And    nenhum caminho de código permite a análise escrever em Documento.status
```

### AC-4: Análise é reproduzível
```gherkin
Given  o mesmo documento de fixture
When   executo a análise duas vezes
Then   recebo exatamente o mesmo parecer
And    nenhuma parte do resultado depende de aleatoriedade
```

### AC-5: Confiança e limite são parte do contrato
```gherkin
Given  qualquer AnaliseDocumento
When   ela é exibida em qualquer tela
Then   a confiança é mostrada
And    aparece a ressalva de que é análise automática e não substitui a revisão da equipe
```

### AC-6: Regra de dependência e DI
```gherkin
Given  a checagem de arquitetura
When   rodo pnpm run ci:local
Then   a porta vive em documentos/application e o adapter em documentos/infrastructure
And    o adapter é resolvido por app/di.ts, e nenhuma tela importa o mock direto
```

## Out of Scope
- Qualquer UI (E07-S02, E07-S03).
- Adapter de LLM real e o custo/PII associados — registrado no design como decisão futura.

## Notas de implementação
- `MockAnalisadorDocumento` determinístico: o defeito de cada documento é declarado na fixture.
- Latência simulada de 2–4s com estado de carregamento real (a espera faz parte do que se demonstra).
- Escreva os testes de AC-3 e AC-4 primeiro — são as duas invariantes do épico.
