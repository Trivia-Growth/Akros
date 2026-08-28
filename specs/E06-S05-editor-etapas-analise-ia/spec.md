---
name: SPEC
description: Contrato do editor de etapas (requisitos de documento) do programa, com opção de análise por IA via skill + arquivo de referência.
story: E06-S05
tier: arquitetural
alwaysApply: false
---

# SPEC — Editor de etapas com análise de documento por IA (E06-S05)

## User Story
Como **admin/case manager**, quero **cadastrar as etapas do processo (requisitos de documento) de
um programa pela própria plataforma**, e **poder habilitar análise por IA em cada uma com uma
skill e um arquivo de referência**, para que **eu não dependa de deploy para ajustar o checklist e
o parecer automático fique mais preciso para aquele documento específico**.

## Contexto
Depende de `E06-S01` (modelo de Programa) e `E06-S04` (catálogo, hoje só-leitura) e estende
`E07-S01` (`AnalisadorDocumentoPort`, ADR-0005). Ver `design.md` desta story — **pré-requisito:
ADR novo (proposto `ADR-0013`) restringindo a cláusula "sem editor no admin" do ADR-0004 a este
sub-escopo, aprovado pelo `@architect` antes de qualquer implementação.**

## Acceptance Criteria

### AC-1: Cadastrar etapa (requisito de documento)
```gherkin
Given  o detalhe de um programa em /admin/programas
When   o admin adiciona um novo requisito de documento a uma fase
Then   o requisito aparece no catálogo daquela fase, com tipo, título, objetivo e obrigatoriedade
And    a mudança não afeta jornadas de clientes já instanciadas (versão do programa continua
       congelada, ADR-0004)
```

### AC-2: Editar e remover etapa
```gherkin
Given  um requisito de documento existente
When   o admin edita seus campos ou tenta removê-lo
Then   a edição é salva
And    a remoção só é permitida se nenhum Documento de cliente aponta para esse requisitoId —
       caso contrário, a ação oferece "desativar" em vez de excluir e explica o motivo do bloqueio
```

### AC-3: Habilitar análise por IA exige skill
```gherkin
Given  o formulário de um requisito de documento
When   o admin liga o toggle "Analisar com IA"
Then   o campo de skill (texto) e o upload de arquivo de referência ficam visíveis
And    salvar com o toggle ligado e a skill vazia é bloqueado com mensagem explicando o motivo
And    o arquivo de referência é opcional mesmo com o toggle ligado
```

### AC-4: Parecer reflete a configuração, decisão continua humana
```gherkin
Given  um requisito com analiseIA.habilitada = true, skill preenchida e arquivo de referência
When   um documento de cliente para esse requisito é analisado
Then   o parecer (AnaliseDocumento) reflete a skill configurada nas sugestões/lacunas retornadas
And    o Documento.status **não** muda sozinho — continua exigindo ação humana para sair de
       "em_analise" (mesma invariante do E07-S01 AC-3, agora coberta também com a skill ligada)
```

### AC-5: Requisito sem IA habilitada não muda de comportamento
```gherkin
Given  um requisito com analiseIA ausente ou habilitada = false
When   um documento desse requisito é analisado
Then   o comportamento é idêntico ao E07-S01 antes desta story — nenhuma regressão
```

### AC-6: Rastreabilidade do arquivo de referência
```gherkin
Given  um requisito com arquivo de referência anexado
When   o admin substitui o arquivo por outro
Then   o anterior fica registrado no histórico do requisito (quem trocou, quando) — não é
       sobrescrito silenciosamente
```

### AC-7: i18n + impeccable
```gherkin
Given  as telas novas (formulário de requisito, seção de IA)
When   troco idioma / avalio design
Then   os rótulos e mensagens de validação traduzem; impeccable passa
And    o campo "skill" (conteúdo do admin, não copy de produto) segue a mesma exceção de i18n já
       registrada para conteúdo de programa (SPEC_DEVIATION da rodada 2)
```

### AC-8: Regra de dependência preservada
```gherkin
Given  a checagem de arquitetura (dependency-cruiser)
When   rodo pnpm run ci:local
Then   a escrita de RequisitoDocumento vive em programas/application + infrastructure
And    a extensão do AnalisadorDocumentoPort não introduz import de programas → documentos nem
       o inverso incorreto (documentos/application continua sendo quem conhece programas, mesma
       direção já documentada como SPEC_DEVIATION no E06-S01)
```

## Out of Scope
- Editor de `Programa` (nome, categoria, sujeito, versão) e de `FaseTemplate` (criar/remover fase) —
  só `RequisitoDocumento` é editável nesta story.
- Adapter de LLM real lendo a skill/arquivo de fato para gerar o parecer — `MockAnalisadorDocumento`
  simula reflexo da configuração sobre fixtures determinísticas (ver `design.md`).
- Status distinto de "arquivado" — tratado como `aprovado` até validação com o Bruno (ver
  `product.md`, questão em aberto).
- Reaproveitamento de arquivo de referência entre requisitos (cada requisito tem o seu, nesta
  rodada).

## Notas de implementação
- Escreva o teste de AC-4/AC-5 primeiro — são a prova de que a invariante do ADR-0005 sobrevive à
  mudança, mesma disciplina do E07-S01.
- Não iniciar a implementação sem o ADR novo (ver `design.md`) aprovado — isso é
  `SPEC_DEVIATION` se pulado, porque reabre uma decisão registrada (ADR-0004).
