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
