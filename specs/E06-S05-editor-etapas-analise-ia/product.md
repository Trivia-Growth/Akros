---
name: PRODUCT
description: Por quê/para quem do editor de etapas do programa com análise de documento por IA configurável.
story: E06-S05
alwaysApply: false
---

# PRODUCT — Editor de etapas com análise de documento por IA (E06-S05)

## Por quê
O catálogo de programas (E06-S04) hoje é **somente leitura** — decisão registrada no ADR-0004
para a rodada 2, porque o valor de demo estava em provar que dois fluxos diferentes rodam no
mesmo motor, não em construir um editor completo. Essa rodada pede o próximo passo: o admin
**cadastra as etapas do processo** (os requisitos de documento de cada fase do programa) pela
própria plataforma, em vez de depender de uma migration nova a cada ajuste.

Junto com isso, cada etapa passa a poder declarar **como a IA deve analisar** o documento daquele
requisito especificamente — hoje `AnalisadorDocumentoPort` (ADR-0005, E07-S01) usa um único campo
genérico (`objetivoRequisito`) igual para tudo. O pedido é dar ao admin duas alavancas por etapa:
uma **skill** (instrução específica de como validar aquele tipo de documento) e um **arquivo de
referência** (um documento-modelo que a IA usa para comparar o que o cliente enviou antes de o
documento seguir para aprovação/arquivamento no caso).

## Para quem
Admin/case manager da Akros que hoje só vê o catálogo de programas e precisaria pedir a um
desenvolvedor para adicionar ou ajustar um requisito de documento. Indiretamente, o cliente, que
recebe um parecer de IA mais preciso porque a etapa foi configurada com a instrução certa.

## Sucesso
- Admin cria/edita uma etapa (requisito de documento) de um programa sem precisar de deploy.
- Por etapa, existe a opção de habilitar análise por IA; quando habilitada, admin preenche a
  skill (texto) e, opcionalmente, anexa um arquivo de referência.
- O parecer de IA daquele requisito passa a refletir a skill e a referência configuradas.
- **O invariante do ADR-0005 continua valendo**: a IA nunca aprova nem arquiva um documento
  sozinha — skill e arquivo de referência mudam a qualidade do parecer, não quem decide.

## Fora de escopo desta story
- Editor completo do Programa (nome, categoria, sujeito, versão, criar programa do zero) —
  continua fora, como o ADR-0004 registrou. Esta story abre só a superfície de
  etapas/requisitos de documento.
- Adapter de LLM real consumindo a skill/arquivo de fato — nesta rodada o `MockAnalisadorDocumento`
  passa a **refletir** a configuração no parecer (prova de conceito determinística), não a
  chamar um provedor de IA de verdade (isso é o "adapter LLM" já registrado como futuro no
  design do E07-S01, com as implicações de PII do ADR-0005).

## Questão em aberto
- "Arquivar" aqui foi tratado como sinônimo de `Documento.status = "aprovado"` (não existe hoje
  um status distinto de arquivamento). Se a Akros quiser um estado separado de "arquivado" depois
  de aprovado, isso é uma extensão da máquina de estados do E07-S01 e precisa validação com o
  Bruno antes de virar AC.
