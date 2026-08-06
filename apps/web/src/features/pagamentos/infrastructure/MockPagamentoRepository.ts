import { dadosRecebimentoPorMoeda } from "@/mocks/dados-recebimento";
import { comLatencia, useMockDb } from "@/mocks/store";
import type { PagamentoRepository } from "../application/ports";
import type { DadosRecebimento, Pagamento } from "../domain/types";

export class MockPagamentoRepository implements PagamentoRepository {
  async listarPorCliente(clienteId: string): Promise<Pagamento[]> {
    const pagamentos = useMockDb.getState().pagamentos.filter((p) => p.clienteId === clienteId);
    return comLatencia(pagamentos);
  }

  async marcarComoPago(id: string): Promise<void> {
    useMockDb.getState().confirmarPagamento(id, "Sistema (demo)");
    return comLatencia(undefined);
  }

  dadosRecebimento(moeda: "BRL" | "USD"): DadosRecebimento {
    return dadosRecebimentoPorMoeda[moeda];
  }

  async anexarComprovante(id: string, urlMock: string): Promise<void> {
    useMockDb.getState().anexarComprovantePagamento(id, urlMock);
    return comLatencia(undefined);
  }

  async confirmar(id: string, autor: string): Promise<void> {
    useMockDb.getState().confirmarPagamento(id, autor);
    return comLatencia(undefined);
  }

  async marcarDivergencia(id: string, valorRecebido: number, autor: string): Promise<void> {
    useMockDb.getState().marcarDivergenciaPagamento(id, valorRecebido, autor);
    return comLatencia(undefined);
  }
}
