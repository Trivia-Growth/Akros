---
name: adr-0006-timeline-unificada-comunicacao
description: Toda comunicação vira EventoComunicacao append-only numa timeline única; WhatsApp é a porta de entrada, o portal é o canal de registro.
alwaysApply: false
---

# ADR-0006 — Timeline unificada de comunicação (WhatsApp + portal, híbrido)

**Status:** Aceito
**Data:** 2026-08-06
**Decisores:** Trívia Studio + Akros (Bruno Luz, Natalia Luz)
**Relacionados:** ADR-0002, épico E08, `docs/ARCHITECTURE.md`

## Contexto
Dois fatos que puxam para lados opostos:

- **O cliente brasileiro vive no WhatsApp.** Empurrá-lo para um canal novo cria fricção real numa
  decisão que já é pesada (mudar de país).
- **A Natalia insiste em e-mail para documentos** porque fica registrado, e no WhatsApp a
  mensagem pode ser apagada por qualquer um dos lados. Num processo federal, o registro do que foi
  pedido e do que foi entregue não é burocracia — é defesa.

Hoje o protótipo tem um inbox de WhatsApp (E04-S01) e um histórico de interações do CRM
(`Interacao`) que **não se conversam**: a mesma conversa aparece em dois lugares com formatos
diferentes, e reunião, e-mail e evento de sistema ficam num terceiro.

## Decisão

**1. Um único registro append-only: `EventoComunicacao`.** Todo contato, de qualquer origem, vira
um evento na mesma coleção, ordenada por tempo:

```ts
type CanalComunicacao = "whatsapp" | "email" | "chat_portal" | "reuniao" | "sistema";

interface EventoComunicacao {
  id: string;
  clienteOuLeadId: string;
  canal: CanalComunicacao;
  direcao: "entrada" | "saida" | "interno";
  autor: string;              // cliente, nome do atendente, ou "Agente IA"
  conteudo: string;
  anexos?: { nome: string; documentoId?: string }[];
  ocorridoEm: string;
  origemId?: string;          // id da mensagem no canal de origem
}
```

Append-only: um evento **não é editado nem apagado**. Correção vira um novo evento. É o que
resolve a objeção da Natalia — o registro do sistema não some quando a mensagem do WhatsApp some.

**2. Híbrido, com papéis distintos por canal.**
- **WhatsApp** = porta de entrada e relacionamento. Continua sendo onde o cliente fala.
- **Chat do portal** = canal de registro. É por onde documento, decisão e aprovação formal passam.
- **E-mail** = mantido, espelhado na timeline.

**3. Documento enviado no canal errado não é rejeitado — é redirecionado.** Se um anexo chega
pelo WhatsApp, o sistema registra o evento, avisa a equipe e devolve ao cliente um atalho para
reenviar pelo portal, com o motivo em uma frase. Bloquear seria criar fricção onde a Akros não
quer; ignorar seria perder o documento.

**4. `Interacao` do CRM é absorvida.** O que hoje é `Interacao` (mudança de fase, nota interna)
passa a ser evento de canal `sistema` / `interno`. Uma timeline, não duas.

## Consequências

**Positivas**
- "O que esse cliente falou em março?" tem uma resposta, em um lugar.
- A visão 360 fica genuinamente 360 — hoje ela é 4 abas que o operador precisa costurar de cabeça.
- Append-only dá base de auditoria sem esforço extra (alinha com `audit.*` do padrão de segurança).

**Negativas / custo**
- Volume: a timeline cresce rápido e precisa de paginação e filtro por canal desde o começo — não
  dá para deixar para depois.
- Migração: a `Interacao` atual e as threads de WhatsApp do mock precisam ser convertidas, e todo
  consumidor de `Interacao` (Cliente360, dashboard) muda junto.
- Sincronizar WhatsApp de verdade (API oficial + Evolution) traz duplicidade de evento e ordem
  fora de sequência. Nesta fase é mock; na real, `origemId` é a chave de deduplicação.

## Alternativas consideradas
- **Só WhatsApp centralizado:** menor fricção, mas mantém intacto o problema que originou o
  pedido (mensagem apagável, documento fora de trilha).
- **Só chat no portal:** registro perfeito, adoção improvável. Perder o canal onde o cliente já
  está para ganhar organização interna é trocar receita por conforto.
