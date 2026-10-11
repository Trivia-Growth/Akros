// _shared/revisao.ts — decisão de revisão otimista (E03-S07). Sem porta própria: cada comando já
// faz seu próprio `UPDATE ... WHERE id = $1 AND revisao = $2 RETURNING revisao` (ou RPC
// equivalente) contra a tabela específica que está mutando; este módulo só padroniza a decisão
// depois do resultado.
import { HttpError } from "./auth.ts";

export class RevisaoObsoleta extends HttpError {
  constructor(public revisaoAtual: number) {
    super(409, "Revisão obsoleta — recarregue e tente novamente");
  }
}

/** `linhasAfetadas` é o rowcount do UPDATE condicionado à revisão esperada. Se zero, o chamador
 *  já fez um SELECT da revisão atual (para devolver no erro) antes de invocar isto. */
export function verificarRevisao(linhasAfetadas: number, revisaoAtual: number): void {
  if (linhasAfetadas === 0) throw new RevisaoObsoleta(revisaoAtual);
}
