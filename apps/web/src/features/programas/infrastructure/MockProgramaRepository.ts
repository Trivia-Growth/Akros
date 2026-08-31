import { comLatencia } from "@/mocks/store";
import { useMockDb } from "@/mocks/store";
import type { ProgramaRepository } from "../application/ports";
import type { Programa } from "../domain/types";

export class MockProgramaRepository implements ProgramaRepository {
  async listar(apenasAtivos = false): Promise<Programa[]> {
    const programas = useMockDb.getState().programas;
    const lista = apenasAtivos ? programas.filter((p) => p.ativo) : programas;
    return comLatencia(lista);
  }

  async obterPorCodigo(codigo: string): Promise<Programa | null> {
    const programa = useMockDb.getState().programas.find((p) => p.codigo === codigo) ?? null;
    return comLatencia(programa);
  }

  async salvar(programa: Programa): Promise<void> {
    useMockDb.getState().salvarPrograma(programa);
    return comLatencia(undefined);
  }

  async duplicar(programaId: string): Promise<Programa | null> {
    const duplicado = useMockDb.getState().duplicarPrograma(programaId);
    return comLatencia(duplicado);
  }
}
