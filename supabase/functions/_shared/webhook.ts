// _shared/webhook.ts — E/S injetável dos webhooks de canal. As Edge Functions finas montam o real
// (`io-supabase.ts`); os testes montam um falso e exercitam o comportamento HTTP inteiro:
// autenticar antes de parsear, recusar o que não é da conta, deduplicar, não vazar erro.
import type { DepsAgente } from "./agente.ts";
import type { Buscador, Provedor } from "./canais/tipos.ts";

export interface ContaCanal {
  id: string;
  ativa: boolean;
  credenciais_configuradas: boolean;
  metadados_publicos: unknown;
}

export interface IOWebhook {
  limite(req: Request): Promise<{ permitido: boolean; reiniciaEm: Date | null }>;
  /** Conta do provedor pedido, não apagada; `null` se não existe ou é de outro provedor. */
  carregarConta(contaId: string, provedor: Provedor): Promise<ContaCanal | null>;
  /** Item do Vault já em objeto; `null` se não existe. Erro de Vault propaga. */
  segredo<T>(escopo: string): Promise<T | null>;
  criarDeps(a: {
    contaId: string;
    usaTelefone: boolean;
    enviar: (texto: string) => Promise<void>;
  }): DepsAgente;
  buscador: Buscador;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const LIMITE_CORPO = 64 * 1024;

/** Resposta mínima ao provedor: nunca descreve o motivo (não é canal de diagnóstico). */
export function resposta(status: number, ok = status < 400): Response {
  return new Response(JSON.stringify({ ok }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function resposta429(reiniciaEm: Date | null): Response {
  const segundos = reiniciaEm ? Math.max(1, Math.ceil((reiniciaEm.getTime() - Date.now()) / 1000)) : 60;
  return new Response(JSON.stringify({ ok: false }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(segundos) },
  });
}

/** Lê o corpo respeitando o limite de bytes ANTES de materializar tudo; `null` se passar. */
export async function lerCorpoLimitado(req: Request): Promise<Uint8Array | null> {
  const declarado = req.headers.get("content-length");
  if (declarado !== null && (!/^\d+$/.test(declarado) || Number(declarado) > LIMITE_CORPO)) return null;
  const bytes = new Uint8Array(await req.arrayBuffer());
  return bytes.byteLength <= LIMITE_CORPO ? bytes : null;
}

export function objetoOuVazio(valor: unknown): Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}
