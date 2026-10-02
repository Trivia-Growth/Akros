// _shared/canais/hmac.ts — assinatura de webhook da Meta (X-Hub-Signature-256).
// A Meta assina o CORPO BRUTO com o App Secret. O corpo só pode ser interpretado depois que a
// assinatura confere: parsear antes entrega PII a quem não provou conhecer o segredo.
import { constantTimeEqual } from "../crypto.ts";

export function paraHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacSha256Hex(segredo: string, corpo: Uint8Array): Promise<string> {
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, corpo as unknown as BufferSource);
  return paraHex(new Uint8Array(assinatura));
}

/** `cabecalho` é o valor de X-Hub-Signature-256 (`sha256=<hex>`). Ausente ou malformado: falso. */
export async function assinaturaMetaValida(
  segredo: string,
  corpo: Uint8Array,
  cabecalho: string | null,
): Promise<boolean> {
  if (!segredo || !cabecalho || !cabecalho.startsWith("sha256=")) return false;
  const esperado = `sha256=${await hmacSha256Hex(segredo, corpo)}`;
  return constantTimeEqual(cabecalho.trim().toLowerCase(), esperado);
}
