import { comLatencia, useMockDb } from "@/mocks/store";
import type { PagamentoRepository } from "../application/ports";
import type { Pagamento } from "../domain/types";

export class MockPagamentoRepository implements PagamentoRepository {
  async listarPorCliente(clienteId: string): Promise<Pagamento[]> {
    const pagamentos = useMockDb.getState().pagamentos.filter((p) => p.clienteId === clienteId);
    return comLatencia(pagamentos);
  }

  async marcarComoPago(id: string): Promise<void> {
    useMockDb.getState().marcarPagamentoComoPago(id);
    return comLatencia(undefined);
  }
}
