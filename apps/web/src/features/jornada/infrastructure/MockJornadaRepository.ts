import { comLatencia, useMockDb } from "@/mocks/store";
import type { JornadaRepository, ProgressoRepository } from "../application/ports";
import type { Jornada } from "../domain/types";

export class MockJornadaRepository implements JornadaRepository {
  async obterPorCliente(clienteId: string): Promise<Jornada | null> {
    const jornada = useMockDb.getState().jornadas.find((j) => j.clienteId === clienteId) ?? null;
    return comLatencia(jornada);
  }

  async liberarFase(clienteId: string, faseId: string): Promise<void> {
    useMockDb.getState().liberarFase(clienteId, faseId);
    return comLatencia(undefined);
  }

  async enviarEtapaParaAvaliacao(clienteId: string, etapaId: string): Promise<void> {
    useMockDb.getState().enviarEtapaParaAvaliacao(clienteId, etapaId);
    return comLatencia(undefined);
  }

  async aprovarEtapa(clienteId: string, etapaId: string): Promise<void> {
    useMockDb.getState().aprovarEtapa(clienteId, etapaId);
    return comLatencia(undefined);
  }

  async devolverEtapaParaAjuste(clienteId: string, etapaId: string, motivo: string): Promise<void> {
    useMockDb.getState().devolverEtapaParaAjuste(clienteId, etapaId, motivo);
    return comLatencia(undefined);
  }
}

export class MockProgressoRepository implements ProgressoRepository {
  async calcularPercentual(clienteId: string): Promise<number> {
    const jornada = useMockDb.getState().jornadas.find((j) => j.clienteId === clienteId);
    if (!jornada) return comLatencia(0);

    const totalEtapas = jornada.fases.reduce((acc, f) => acc + f.etapas.length, 0);
    const concluidas = jornada.fases.reduce(
      (acc, f) => acc + f.etapas.filter((e) => e.status === "concluida").length,
      0,
    );
    const percentual = totalEtapas === 0 ? 0 : Math.round((concluidas / totalEtapas) * 100);
    return comLatencia(percentual);
  }
}
