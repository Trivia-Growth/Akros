import type { Sessao } from "../domain/types";

export interface SessaoService {
  login(email: string, senha: string): Promise<Sessao>;
  /** null quando não há cookie de refresh válido — front trata como "sem sessão". */
  refresh(): Promise<Sessao | null>;
  logout(accessToken: string | null): Promise<void>;
}
