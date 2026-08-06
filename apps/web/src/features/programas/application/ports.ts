import type { Programa } from "../domain/types";

export interface ProgramaRepository {
  listar(apenasAtivos?: boolean): Promise<Programa[]>;
  obterPorCodigo(codigo: string): Promise<Programa | null>;
}
