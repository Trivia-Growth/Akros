---
name: adr-0004-programa-de-visto-como-dado
description: Cada tipo de visto vira um Programa (dado versionado) com template de jornada e catálogo de documentos, em vez de código hardcoded.
alwaysApply: false
---

# ADR-0004 — Programa de Visto como dado, não como código

**Status:** Aceito
**Data:** 2026-08-06
**Decisores:** Trívia Studio + Akros (Bruno Luz)
**Relacionados:** docs/ARCHITECTURE.md, ADR-0002, épico E06

## Contexto
O protótipo nasceu com a jornada EB-2 NIW **hardcoded** em `mocks/jornada-template.ts`
(`criarFasesTemplate()` devolve as 6 fases literais). Funciona para um fluxo só.

A Akros já opera outros fluxos hoje — o mais relevante é o **visto religioso (R / EB-4)** para
igrejas, cuja documentação é completamente diferente (documentos financeiros e institucionais da
instituição, extratos bancários) e cujo sujeito do processo muitas vezes **não é uma pessoa
física isolada, mas uma organização patrocinadora**. Há ainda a hipótese futura de outras
consultorias de imigração usarem a plataforma para categorias que a Akros não atende.

Se cada novo visto exigir uma nova função de template no código, o custo marginal de um fluxo
novo é uma release. Isso mata a escalabilidade pedida.

## Decisão
Introduzir a entidade **Programa de Visto** como **dado versionado**, no bounded context
`programas`. Um Programa carrega tudo que hoje está espalhado em código:

```
Programa {
  id, codigo ("eb2-niw" | "religioso-r-eb4"), nome, categoria, versao,
  fasesTemplate: FaseTemplate[],            // gera a Jornada ao abrir o caso
  documentosExigidos: RequisitoDocumento[], // catálogo por fase, com tipo e regras
  sujeito: "individuo" | "organizacao",     // muda o formulário e o checklist
  ativo: boolean
}
```

A `Jornada` do cliente passa a ser **instanciada a partir de** um Programa
(`Cliente.programaId` + `Jornada.programaVersao`), e não construída por uma função específica.
`criarFasesTemplate()` deixa de existir como fonte de verdade e vira o dado do programa
`eb2-niw`.

**Versão congelada por caso:** a jornada guarda a versão do programa usada na abertura. Mudar o
programa não reescreve o processo de quem já está em andamento — regra de negócio, não detalhe
técnico: o cliente contratou um escopo.

## Consequências

**Positivas**
- Fluxo novo = novo registro de Programa. Sem release.
- O segundo programa (religioso) vira **prova executável** de que a arquitetura escala — é o
  critério de aceite do épico E06, não uma promessa.
- Prepara o caminho para multi-tenant (cada consultoria com seu catálogo) sem decidi-lo agora.

**Negativas / custo**
- Uma indireção a mais entre cliente e jornada. Debug de "por que essa fase apareceu" passa a
  exigir olhar o programa e a versão.
- O conteúdo textual das fases sai do código e entra em dado — precisa de i18n por programa
  (chave de tradução no dado, não texto literal).

**Fora desta rodada (registrado de propósito)**
- Editor de programas no admin (admin só **lê** o catálogo nesta fase).
- Multi-tenant / white-label: exige isolamento por organização, RLS por tenant e modelo de
  billing. É um ADR próprio quando houver decisão comercial.

## Alternativas consideradas
- **Uma função de template por visto** (`criarFasesEB2()`, `criarFasesReligioso()`): mais simples
  hoje, mas o custo marginal por visto continua sendo código, que é exatamente o problema.
- **Programa totalmente editável pelo admin já nesta rodada:** muita superfície de UI para
  mockar, e o valor de demo é menor que o de mostrar dois fluxos reais funcionando.
