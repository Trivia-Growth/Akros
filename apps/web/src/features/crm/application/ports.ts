import type { Cliente, Proposta } from "../domain/types";

export interface ClienteRepository {
  listar(): Promise<Cliente[]>;
  obter(id: string): Promise<Cliente | null>;
  /** E06-S03: programaCodigo omitido usa "eb2-niw" (default histórico do protótipo). */
  criarAPartirDeLead(leadId: string, programaCodigo?: string): Promise<Cliente>;
  atualizar(id: string, patch: Partial<Cliente>): Promise<void>;
}

export interface PropostaRepository {
  listar(): Promise<Proposta[]>;
  obter(id: string): Promise<Proposta | null>;
  criar(input: Omit<Proposta, "id" | "status" | "criadoEm">): Promise<Proposta>;
  enviar(id: string): Promise<void>;
  marcarStatus(id: string, status: Proposta["status"]): Promise<void>;
}
