// _shared/canais/anexo.ts — política de anexos recebidos por canal (E13-S15, FR-026).
// O bucket `comunicacao-anexos` (migration 0039) impõe os mesmos limites; aqui se decide ANTES de
// baixar, para não trazer 15 MB de um tipo que o bucket recusaria.

export const LIMITE_ANEXO_BYTES = 15 * 1024 * 1024;

export const MIMES_ANEXO_PERMITIDOS: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "video/3gpp",
]);

export type MotivoSemAnexo = "tamanho" | "tipo" | "download";

/** Decisão prévia (sem rede): `null` = pode tentar baixar. */
export function motivoParaNaoBaixar(mime: string, tamanhoBytes: number | null): MotivoSemAnexo | null {
  if (!MIMES_ANEXO_PERMITIDOS.has(mime)) return "tipo";
  if (tamanhoBytes !== null && tamanhoBytes > LIMITE_ANEXO_BYTES) return "tamanho";
  return null;
}
