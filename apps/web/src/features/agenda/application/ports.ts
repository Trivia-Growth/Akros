import type { Reuniao, Transcricao } from "../domain/types";

export interface AgendaConsulta {
  carregarCliente(): Promise<{ reunioes: Reuniao[]; transcricoes: Transcricao[] }>;
  carregarAdmin(): Promise<{
    reunioes: Reuniao[];
    transcricoes: Transcricao[];
    nomesClientes: Record<string, string>;
  }>;
}

export interface AgendaRepository {
  listarPorCliente(clienteId: string): Promise<Reuniao[]>;
  listarTodas(): Promise<Reuniao[]>;
  agendar(input: Omit<Reuniao, "id" | "status">): Promise<Reuniao>;
}

export interface TranscricaoRepository {
  obterPorReuniao(reuniaoId: string): Promise<Transcricao | null>;
  listarPorCliente(clienteId: string): Promise<Transcricao[]>;
}
