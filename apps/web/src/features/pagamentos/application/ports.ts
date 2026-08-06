import type { Pagamento } from "../domain/types";

export interface PagamentoRepository {
  listarPorCliente(clienteId: string): Promise<Pagamento[]>;
  marcarComoPago(id: string): Promise<void>;
}
