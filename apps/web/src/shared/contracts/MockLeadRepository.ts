import { comLatencia, useMockDb } from "@/mocks/store";
import type {
  EstagioLead,
  Lead,
  LeadRepository,
  NovoLead,
  OrigemCampoPerfil,
  PerfilLead,
} from "./lead";

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

  async atualizarPerfil(
    id: string,
    patch: Partial<PerfilLead>,
    origem: OrigemCampoPerfil,
  ): Promise<void> {
    useMockDb.getState().atualizarPerfilLead(id, patch, origem);
    return comLatencia(undefined);
  }

  async responderQualificacao(id: string, perguntaId: string, resposta: string): Promise<void> {
    useMockDb.getState().responderQualificacaoLead(id, perguntaId, resposta);
    return comLatencia(undefined);
  }

  async decidirGateAgendamento(
    id: string,
    decisao: "aprovado" | "recusado",
    autor: string,
    motivoRecusa?: string,
  ): Promise<void> {
    useMockDb.getState().decidirGateAgendamento(id, decisao, autor, motivoRecusa);
    return comLatencia(undefined);
  }
}
