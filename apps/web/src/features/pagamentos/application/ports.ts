import type { DadosRecebimento, Pagamento } from "../domain/types";

/** Leitura dos pagamentos do cliente e instruções de recebimento permitidas por RLS. */
export interface PagamentosConsulta {
  carregarCliente(): Promise<{
    pagamentos: Pagamento[];
    dadosRecebimento: DadosRecebimento[];
  }>;
}

export interface PagamentoRepository {
  listarPorCliente(clienteId: string): Promise<Pagamento[]>;
  criar(input: Omit<Pagamento, "id" | "status">): Promise<Pagamento>;
  /** @deprecated fluxo E10-S01 substitui por anexarComprovante + confirmar (equipe). */
  marcarComoPago(id: string): Promise<void>;
  dadosRecebimento(moeda: "BRL" | "USD"): DadosRecebimento;
  anexarComprovante(id: string, urlMock: string): Promise<void>;
  confirmar(id: string, autor: string): Promise<void>;
  marcarDivergencia(id: string, valorRecebido: number, autor: string): Promise<void>;
}
