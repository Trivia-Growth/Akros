import { comLatencia, useMockDb } from "@/mocks/store";
import type { EstagioLead, Lead, LeadRepository, NovoLead } from "./lead";

export class MockLeadRepository implements LeadRepository {
  async listar(): Promise<Lead[]> {
    return comLatencia(useMockDb.getState().leads);
  }

  async obter(id: string): Promise<Lead | null> {
    const lead = useMockDb.getState().leads.find((l) => l.id === id) ?? null;
    return comLatencia(lead);
  }

  async criar(input: NovoLead): Promise<Lead> {
    const lead = useMockDb.getState().criarLead(input);
    return comLatencia(lead);
  }

  async moverEstagio(id: string, estagio: EstagioLead): Promise<void> {
    useMockDb.getState().moverEstagioLead(id, estagio);
    return comLatencia(undefined);
  }

  async adicionarNota(id: string, nota: string): Promise<void> {
    useMockDb.getState().adicionarNotaLead(id, nota);
    return comLatencia(undefined);
  }
}
