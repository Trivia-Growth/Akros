export type PagamentoStatus = "pendente" | "em_conferencia" | "pago" | "divergente" | "atrasado";
export type PagamentoTipo = "entrada" | "taxa_federal" | "parcela";

export interface Pagamento {
  id: string;
  clienteId: string;
  descricao: string;
  valor: number;
  moeda: "BRL" | "USD";
  status: PagamentoStatus;
  vencimento: string;
  tipo: PagamentoTipo;
  pagoEm?: string;
  /** E10-S01: comprovante anexado pelo cliente. */
  comprovanteUrl?: string;
  anexadoEm?: string;
  /** E10-S01 AC-4: valor efetivamente recebido, quando diverge do valor devido. */
  valorRecebido?: number;
  confirmadoPor?: string;
  /** E03-S07 (migration 0021) — condição contratual que originou esta cobrança. */
  contratoCondicaoId?: string;
  /** E03-S07 — versão do comprovante recebida via OneDrive (arquivos.versoes). */
  comprovanteVersaoId?: string;
  /** E03-S07 — motivo da divergência, obrigatório quando status = 'divergente'. */
  motivoDivergencia?: string;
  /** E03-S07 — admin que confirmou a conciliação (uuid, substitui `confirmadoPor` legado). */
  confirmadoPorId?: string;
  /** E03-S07 — trava de revisão otimista para `conciliar_pagamento`. Ausente em pagamento
   * mockado (demo), sempre presente no pagamento real. */
  revisao?: number;
}

/**
 * E10-S01 — dados de recebimento por transferência (sem gateway, decisão do cliente).
 * TODOS OS DADOS SÃO FICTÍCIOS — nunca usar informação bancária real da Akros aqui.
 */
export interface DadosRecebimento {
  moeda: "BRL" | "USD";
  titular: string;
  banco: string;
  agencia?: string;
  conta?: string;
  chavePix?: string;
  routingNumber?: string;
  accountNumber?: string;
  swift?: string;
  instrucoes: string;
}
