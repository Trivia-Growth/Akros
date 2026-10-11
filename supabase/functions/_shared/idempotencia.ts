// _shared/idempotencia.ts — idempotência de comandos (E03-S07). Mesmo padrão porta/adapter:
// porta `IOIdempotencia` aqui, lógica pura que a consome; o adapter real (`service_role`, contra
// `comandos.idempotencia`) vai em `io-supabase-caso.ts` ("E/S real dos comandos de caso").
import { HttpError } from "./auth.ts";

export interface IOIdempotencia {
  buscar(chave: string): Promise<{ hashConteudo: string; resultado: unknown } | null>;
  gravar(chave: string, hashConteudo: string, resultado: unknown, criadoPor: string): Promise<void>;
}

async function sha256Hex(texto: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Chave efetiva = sha256(nomeAcao + ":" + idempotencyKeyDoCliente) — nunca a chave bruta do
 *  cliente sozinha, para não colidir entre ações diferentes.
 *  Mesma chave + mesmo hash de conteúdo → devolve `resultado` anterior sem reprocessar.
 *  Mesma chave + hash diferente → HttpError(409).
 *  Chave nova → processa, grava e devolve o resultado novo. */
export async function comIdempotencia<T>(
  io: IOIdempotencia,
  nomeAcao: string,
  idempotencyKey: string,
  conteudo: unknown,
  criadoPor: string,
  processar: () => Promise<T>,
): Promise<T> {
  const chaveEfetiva = await sha256Hex(`${nomeAcao}:${idempotencyKey}`);
  const hashConteudo = await sha256Hex(JSON.stringify(conteudo) ?? "null");

  const existente = await io.buscar(chaveEfetiva);
  if (existente) {
    if (existente.hashConteudo !== hashConteudo) {
      throw new HttpError(409, "Mesma chave de idempotência com conteúdo diferente");
    }
    return existente.resultado as T;
  }

  const resultado = await processar();
  await io.gravar(chaveEfetiva, hashConteudo, resultado, criadoPor);
  return resultado;
}
