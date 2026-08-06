import { comLatencia, useMockDb } from "@/mocks/store";
import type { ClienteRepository } from "../application/ports";
import type { Cliente, Interacao } from "../domain/types";

export class MockClienteRepository implements ClienteRepository {
  async listar(): Promise<Cliente[]> {
    return comLatencia(useMockDb.getState().clientes);
  }

  async obter(id: string): Promise<Cliente | null> {
    const cliente = useMockDb.getState().clientes.find((c) => c.id === id) ?? null;
    return comLatencia(cliente);
  }

  async criarAPartirDeLead(leadId: string): Promise<Cliente> {
    const cliente = useMockDb.getState().criarClienteAPartirDeLead(leadId);
    return comLatencia(cliente);
  }

  async atualizar(id: string, patch: Partial<Cliente>): Promise<void> {
    useMockDb.getState().atualizarCliente(id, patch);
    return comLatencia(undefined);
  }

  async historico(clienteId: string): Promise<Interacao[]> {
    const historico = useMockDb
      .getState()
      .interacoes.filter((i) => i.clienteId === clienteId)
      .sort((a, b) => a.ocorridoEm.localeCompare(b.ocorridoEm));
    return comLatencia(historico);
  }

  async registrarInteracao(interacao: Omit<Interacao, "id">): Promise<void> {
    useMockDb.getState().registrarInteracao(interacao);
    return comLatencia(undefined);
  }
}
