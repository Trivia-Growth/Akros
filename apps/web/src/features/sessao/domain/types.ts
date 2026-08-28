export type Papel = "cliente" | "admin";

export interface UsuarioSessao {
  id: string;
  email: string;
  papel: Papel;
  /** Só presente quando `papel === "cliente"` (E13: vai apontar pra uma linha real de `clientes`). */
  clienteId?: string;
}

export interface Sessao {
  accessToken: string;
  expiresAt: number;
  usuario: UsuarioSessao;
}
