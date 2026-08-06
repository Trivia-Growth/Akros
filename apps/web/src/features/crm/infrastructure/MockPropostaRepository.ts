import { comLatencia, useMockDb } from "@/mocks/store";
import type { PropostaRepository } from "../application/ports";
import type { Proposta } from "../domain/types";

export class MockPropostaRepository implements PropostaRepository {
  async listar(): Promise<Proposta[]> {
    return comLatencia(useMockDb.getState().propostas);
  }

  async obter(id: string): Promise<Proposta | null> {
    const proposta = useMockDb.getState().propostas.find((p) => p.id === id) ?? null;
    return comLatencia(proposta);
  }

  async criar(input: Omit<Proposta, "id" | "status" | "criadoEm">): Promise<Proposta> {
    const proposta = useMockDb.getState().criarProposta(input);
    return comLatencia(proposta);
  }

  async enviar(id: string): Promise<void> {
    useMockDb.getState().enviarProposta(id);
    return comLatencia(undefined);
  }

  async marcarStatus(id: string, status: Proposta["status"]): Promise<void> {
    useMockDb.getState().marcarStatusProposta(id, status);
    return comLatencia(undefined);
  }
}
