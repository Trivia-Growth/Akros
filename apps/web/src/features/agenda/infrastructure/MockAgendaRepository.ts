import { comLatencia, useMockDb } from "@/mocks/store";
import type { AgendaRepository, TranscricaoRepository } from "../application/ports";
import type { Reuniao, Transcricao } from "../domain/types";

export class MockAgendaRepository implements AgendaRepository {
  async listarPorCliente(clienteId: string): Promise<Reuniao[]> {
    const reunioes = useMockDb.getState().reunioes.filter((r) => r.clienteId === clienteId);
    return comLatencia(reunioes);
  }

  async listarTodas(): Promise<Reuniao[]> {
    return comLatencia(useMockDb.getState().reunioes);
  }

  async agendar(input: Omit<Reuniao, "id" | "status">): Promise<Reuniao> {
    const reuniao = useMockDb.getState().agendarReuniao(input);
    return comLatencia(reuniao);
  }
}

export class MockTranscricaoRepository implements TranscricaoRepository {
  async obterPorReuniao(reuniaoId: string): Promise<Transcricao | null> {
    const t = useMockDb.getState().transcricoes.find((tr) => tr.reuniaoId === reuniaoId) ?? null;
    return comLatencia(t);
  }

  async listarPorCliente(clienteId: string): Promise<Transcricao[]> {
    const reunioesDoCliente = new Set(
      useMockDb
        .getState()
        .reunioes.filter((r) => r.clienteId === clienteId)
        .map((r) => r.id),
    );
    const transcricoes = useMockDb
      .getState()
      .transcricoes.filter((t) => reunioesDoCliente.has(t.reuniaoId));
    return comLatencia(transcricoes);
  }
}
