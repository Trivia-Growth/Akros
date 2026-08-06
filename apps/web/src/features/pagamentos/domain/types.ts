export type PagamentoStatus = "pendente" | "pago" | "atrasado";
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
}
