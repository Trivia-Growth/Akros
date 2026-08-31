import type { SessaoService } from "../application/ports";
import type { Sessao } from "../domain/types";

/** Formulário/fetch cross-site não consegue setar header customizado — segunda camada de CSRF (ADR-0008). */
const CSRF_HEADER = { "X-Akros-Csrf": "1" };

async function lerSessao(res: Response): Promise<Sessao> {
  if (!res.ok) throw new Error(`Falha de autenticação (${res.status})`);
  return res.json();
}

export class EdgeFunctionSessaoService implements SessaoService {
  async login(email: string, senha: string): Promise<Sessao> {
    const res = await fetch("/api/sessao/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    return lerSessao(res);
  }

  async refresh(): Promise<Sessao | null> {
    const res = await fetch("/api/sessao/refresh", {
      method: "POST",
      credentials: "include",
      headers: CSRF_HEADER,
    });
    if (!res.ok) return null;
    return lerSessao(res);
  }

  async logout(accessToken: string | null): Promise<void> {
    await fetch("/api/sessao/logout", {
      method: "POST",
      credentials: "include",
      headers: {
        ...CSRF_HEADER,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    }).catch(() => {
      // best-effort — a store local zera de qualquer forma (ver application/hooks.ts::logout).
    });
  }
}

export const sessaoService = new EdgeFunctionSessaoService();
