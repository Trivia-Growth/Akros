import { catalogoProgramas } from "@/mocks/programas";
import { comLatencia } from "@/mocks/store";
import type { ProgramaRepository } from "../application/ports";
import type { Programa } from "../domain/types";

/** Catálogo é dado estático — sem editor nesta rodada (ADR-0004), por isso não vive no useMockDb. */
export class MockProgramaRepository implements ProgramaRepository {
  async listar(apenasAtivos = false): Promise<Programa[]> {
    const lista = apenasAtivos ? catalogoProgramas.filter((p) => p.ativo) : catalogoProgramas;
    return comLatencia(lista);
  }

  async obterPorCodigo(codigo: string): Promise<Programa | null> {
    const programa = catalogoProgramas.find((p) => p.codigo === codigo) ?? null;
    return comLatencia(programa);
  }
}
