// _shared/canais/tipos.ts — contrato comum dos adaptadores de canal (ADR-0017).
// Um adaptador sabe duas coisas: ler uma entrega JÁ autenticada e enviar texto. Todo o resto
// (deduplicar, decidir encaminhar, chamar a IA, fechar o recibo) vive no pipeline, uma vez só.

export type Provedor = "evolution" | "whatsapp_oficial" | "instagram";

/** Mensagem recebida, já normalizada, igual para qualquer canal. */
export interface EntradaCanal {
  /** Id do provedor (key.id, wamid, mid). Chave de deduplicação junto com a conta. */
  origemId: string;
  /** Telefone só com dígitos (WhatsApp) ou id do remetente (Instagram). */
  contatoExterno: string;
  nome: string | null;
  texto: string;
  /** ISO 8601. */
  ocorridoEm: string;
}

export type Buscador = typeof fetch;

/**
 * Falha ao falar com o provedor. Guarda só o status: o corpo da resposta pode carregar telefone,
 * texto do cliente ou eco de credencial, então nunca entra na mensagem nem no log.
 */
export class ErroProvedor extends Error {
  constructor(
    public readonly provedor: string,
    public readonly status: number,
  ) {
    super(`${provedor} respondeu ${status}`);
  }
}

export const LIMITE_TEXTO_ENTRADA = 4000;

/** Limite de caracteres de saída por canal (o do Instagram é o mais apertado). */
export const LIMITE_TEXTO_SAIDA: Record<Provedor, number> = {
  evolution: 1600,
  whatsapp_oficial: 1600,
  instagram: 900,
};

export function objeto(valor: unknown): Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

export function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}
