import { comLatencia, useMockDb } from "@/mocks/store";
import type { ClienteRepository } from "../application/ports";
import type { Cliente } from "../domain/types";

export class MockClienteRepository implements ClienteRepository {
  async listar(): Promise<Cliente[]> {
    return comLatencia(useMockDb.getState().clientes);
  }

  async obter(id: string): Promise<Cliente | null> {
    const cliente = useMockDb.getState().clientes.find((c) => c.id === id) ?? null;
    return comLatencia(cliente);
  }

  async criarAPartirDeLead(leadId: string, programaCodigo?: string): Promise<Cliente> {
    const cliente = useMockDb.getState().criarClienteAPartirDeLead(leadId, programaCodigo);
    return comLatencia(cliente);
  }

  async atualizar(id: string, patch: Partial<Cliente>): Promise<void> {
    useMockDb.getState().atualizarCliente(id, patch);
    return comLatencia(undefined);
  }
}
