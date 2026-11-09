import type { Pagamento } from "./types";

/**
 * E03-S07 (Fase 7/US4) — domínio puro de conciliação. Espelha as regras de
 * `pagamentos.conciliar_pagamento` (migration 0045): comprovante enviado nunca leva a 'pago'
 * sozinho (só 'em_conferencia'); vencido e em conferência são status distintos (nunca
 * confundidos); moedas nunca somadas num único total; divergência sempre exige motivo.
 */

export interface TotalPorMoeda {
  moeda: "BRL" | "USD";
  pendente: number;
  emConferencia: number;
  pago: number;
  atrasado: number;
  divergente: number;
}

/** Agrupa por moeda — nunca soma BRL com USD num único número. */
export function totalizarPorMoeda(pagamentos: Pagamento[]): TotalPorMoeda[] {
  const porMoeda = new Map<"BRL" | "USD", TotalPorMoeda>();
  for (const pagamento of pagamentos) {
    const atual = porMoeda.get(pagamento.moeda) ?? {
      moeda: pagamento.moeda,
      pendente: 0,
      emConferencia: 0,
      pago: 0,
      atrasado: 0,
      divergente: 0,
    };
    if (pagamento.status === "pendente") atual.pendente += pagamento.valor;
    else if (pagamento.status === "em_conferencia") atual.emConferencia += pagamento.valor;
    else if (pagamento.status === "pago") atual.pago += pagamento.valor;
    else if (pagamento.status === "atrasado") atual.atrasado += pagamento.valor;
    else if (pagamento.status === "divergente") atual.divergente += pagamento.valor;
    porMoeda.set(pagamento.moeda, atual);
  }
  return [...porMoeda.values()];
}

export interface ConciliacaoInput {
  decisao: "pago" | "divergente";
  valorRecebido: number;
  motivoDivergencia?: string;
}

/** Valida antes de chamar a Edge Function — mesma regra do CHECK/RPC (defesa em profundidade,
 *  erro de formulário antes de round-trip). Retorna a mensagem do primeiro problema, ou
 *  `undefined` se válido. */
export function validarConciliacao(input: ConciliacaoInput): string | undefined {
  if (!Number.isFinite(input.valorRecebido) || input.valorRecebido <= 0) {
    return "valorInvalido";
  }
  if (input.decisao === "divergente" && !input.motivoDivergencia?.trim()) {
    return "motivoObrigatorio";
  }
  return undefined;
}
