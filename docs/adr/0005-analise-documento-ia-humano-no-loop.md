---
name: adr-0005-analise-documento-ia-humano-no-loop
description: Análise de documento por IA fica atrás de uma porta e nunca muda status sozinha — o parecer é insumo, a decisão é humana.
alwaysApply: false
---

# ADR-0005 — Análise de documento por IA: porta dedicada e humano no loop

**Status:** Aceito
**Data:** 2026-08-06
**Decisores:** Trívia Studio + Akros (Bruno Luz)
**Relacionados:** ADR-0002, épico E07, `ia/`

## Contexto
O pedido da Akros não é "um chatbot em cima dos documentos". É específico: identificar **que tipo
de documento** foi enviado, verificar se ele **atende ao objetivo** daquele item do checklist, e
apontar **o que falta** antes de a equipe olhar.

O exemplo dado é o caso de teste: **carta de experiência** (emitida pela empresa, assinada,
comprova tempo e responsabilidades) e **carta de recomendação** (pessoa que atesta a qualidade do
trabalho) se parecem, servem para coisas diferentes, e o cliente troca uma pela outra. Carteira de
trabalho, que o cliente manda achando que resolve, não tem valor para a imigração americana.

Isso é análise de conteúdo, não de arquivo. E é uma decisão que afeta uma petição federal.

## Decisão

**1. A IA fica atrás de uma porta.** `AnalisadorDocumentoPort` em
`features/documentos/application/ports.ts`:

```ts
interface AnalisadorDocumentoPort {
  analisar(input: { documentoId: string; requisitoId: string }): Promise<AnaliseDocumento>;
}

interface AnaliseDocumento {
  tipoDetectado: TipoDocumento;
  aderencia: "atende" | "atende_com_ressalva" | "nao_atende" | "tipo_incorreto";
  confianca: number;            // 0..1 — exibido, nunca escondido
  lacunas: Lacuna[];            // o que falta, item a item
  sugestoes: string[];          // como corrigir, em linguagem de cliente
  analisadoEm: string;
}
```
Agora: `MockAnalisadorDocumento` (regras determinísticas sobre as fixtures). Depois: adapter LLM.
A UI não sabe qual é qual — mesma regra do ADR-0002.

**2. A IA nunca muda o status do documento.** O parecer entra como **insumo**; o documento só sai
de `em_analise` por ação humana registrada (quem, quando). O status de análise é um campo
**separado** do status do documento, justamente para que não haja como confundi-los:

```
Documento.status         : pendente | enviado | em_analise | aprovado | ajustes   (humano decide)
Documento.analise?       : AnaliseDocumento                                        (IA sugere)
```

**3. O parecer é mostrado ao cliente antes da fila humana.** O cliente envia, recebe o retorno da
IA em segundos, e pode corrigir sozinho. Isso reduz retrabalho da equipe **sem** tirar o
comprometimento do cliente — ele continua sendo quem resolve o problema, só que informado.

**4. Confiança e limites são visíveis.** Toda análise mostra a confiança e a frase de limite
("análise automática, não substitui a revisão da equipe"). Nada de parecer de IA disfarçado de
decisão da Akros.

## Consequências

**Positivas**
- A equipe recebe o documento já triado, com o erro já apontado.
- Trocar o motor (regra → LLM → LLM com fine-tune) não toca a UI.
- Auditoria limpa: dá para responder "quem aprovou este documento" sem ambiguidade.

**Negativas / custo**
- Dois campos de status para manter coerentes; a UI precisa deixar claríssimo qual é qual.
- Falso negativo da IA ("não atende" para um documento válido) frustra o cliente. Mitigação: o
  cliente sempre pode enviar assim mesmo e escalar para revisão humana — a IA não bloqueia.
- Quando o adapter virar LLM: prompt, custo por análise e vazamento de dado sensível passam a ser
  preocupações reais. Documento de imigração é PII pesado. Ver `ia/` e `docs/SECURITY_DEBT.md`.

## Alternativas consideradas
- **IA aprova sozinha o que é objetivo** (legibilidade, página faltando): reduz fila, mas cria uma
  classe de aprovação sem responsável. Descartado — coerente com a posição da própria Akros de
  manter validação humana também na qualificação de lead.
- **IA só conversa com o cliente e a Akros nunca vê o reprovado:** esconde da equipe o padrão de
  erro dos clientes, que é justamente o dado que melhora o manual e o checklist.
