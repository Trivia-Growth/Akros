---
name: adr-0013-requisito-documento-editavel-por-admin
description: Exceção pontual ao ADR-0004 — RequisitoDocumento passa a ser editável pela UI do admin (escopo mínimo), com análise por IA configurável por requisito; o resto do Programa continua imutável pela UI.
alwaysApply: false
---

# ADR-0013 — Requisito de documento editável pelo admin (exceção pontual ao ADR-0004)

**Status:** Aceito
**Data:** 2026-09-07
**Decisores:** Trívia Studio + Akros (Bruno Luz)
**Relacionados:** ADR-0004, ADR-0005, specs/E06-S05-editor-etapas-analise-ia/

## Contexto
O ADR-0004 registrou o Programa de visto como dado versionado com o admin **somente leitura**
("Editor de programas no admin" consta como não-objetivo daquela rodada). O motivo era
blast radius: sem versionamento de casos instanciados, uma edição pela UI poderia mudar o
checklist de jornadas de clientes em andamento.

O custo dessa escolha apareceu em operação: cada ajuste de requisito de documento (adicionar um
item ao checklist de uma fase, corrigir objetivo) exige uma alteração em código + deploy. Para um
produto cujo catálogo muda com a prática (novos pareceres, novas exigências consulares), isso é
gargalo real — e é exatamente o tipo de configuração que a operação da Akros deveria controlar
sozinha.

Em paralelo, o ADR-0005 (E07-S01) estabeleceu a análise de documento por IA com um único campo
genérico (`objetivoRequisito`) igual para todos os requisitos — o parecer não reflete a
especificidade de cada tipo de documento.

## Decisão
1. **Exceção pontual ao ADR-0004, de escopo mínimo:** `RequisitoDocumento` (os itens de
   `documentosExigidos` dentro de uma fase existente) passa a ser **criável/editável/removível
   pela UI do admin**. Nada mais: `Programa` (nome, categoria, sujeito, versão) e
   `FaseTemplate` (criar/remover/reordenar fases) **continuam imutáveis pela UI**. A cláusula
   "sem editor no admin" do ADR-0004 segue valendo para todo o resto.
2. **Congelamento por caso preservado:** a edição de requisitos afeta o *template do programa*;
   a jornada já instanciada de um cliente continua congelada pela versão que ela referencia
   (`programaVersao`, mecanismo do ADR-0004 inalterado). Editou o template, quem já está no
   processo não muda de checklist no meio do caminho.
3. **Remoção com dependência é bloqueio, não cascade:** remover um requisito que já tem
   `Documento` de cliente apontando para ele é recusado; a UI oferece "desativar". Rastreabilidade
   do cliente manda sobre conveniência do admin.
4. **Análise por IA configurável por requisito:** `RequisitoDocumento` ganha `analiseIA`
   opcional (`habilitada`, `skill`, `arquivoReferenciaId`). A porta `AnalisadorDocumentoPort`
   (ADR-0005) estende o input com `skillAnalise?` e `arquivoReferenciaId?` — campos opcionais,
   sem quebra de contrato para consumidores existentes.
5. **A invariante do ADR-0005 não se move:** skill e arquivo de referência mudam o *conteúdo do
   parecer*, nunca o `Documento.status`. Sair de `em_analise` continua exigindo ação humana.

## Alternativas consideradas
| Alternativa | Prós | Contras | Por que (não) escolhida |
|---|---|---|---|
| Editor completo de Programa (fases, versão, sujeito, categoria) | flexibilidade total | reabre versionamento de caso instanciado; blast radius grande | excede o pedido; o valor está nos requisitos, não no catálogo inteiro |
| Continuar só via código/migration | zero risco de regressão no demo | gargalo de deploy para ajuste operacional trivial | é exatamente o problema que esta decisão resolve |
| Tornar o Programa inteiro versionado com migração automática de casos | edição livre sem perder histórico | projeto grande (diff de template, migração de checklist em andamento) | prematuro; exceção pontual resolve o caso de uso hoje |
| Arquivo de referência persistido em storage real | análise real por LLM já compararia conteúdo | E13 ainda não liberou Storage; PII pesado exige decisão de retenção antes | mock de metadados nesta rodada, igual à regra do upload de documento do cliente (E02-S03) |

## Consequências
- `programas` deixa de ser 100% só-leitura no admin — primeira escrita no contexto desde o
  ADR-0004. Gate de arquitetura (AC-8 da spec) confirma que a escrita vive em
  `programas/application` + `infrastructure` e não inverte a direção documentos→programas.
- Quando o adapter de LLM real existir, a skill e o arquivo de referência passam a influenciar
  o parecer de verdade — custo por análise com skill customizada deve ser observado (pendência
  registrada no design.md).
- Se a exceção se expandir para fases/programa inteiros, será com ADR novo — este não autoriza
  crescimento de escopo por osmose.
