/**
 * E03-S07 / ADR-0019 — porta e limites do envio de arquivo (recebimento durável no Storage,
 * transferência ao OneDrive por trabalho persistente). Ver design-tecnico.md §6 "Limites fixados".
 * Espelhado em supabase/functions/_shared/limites.ts — os dois runtimes mantêm os mesmos valores.
 */
import type { EstadoArmazenamento, EstadoRecebimento } from "./caso";

/** Limite de tamanho de PDF aceito pela plataforma (design-tecnico.md §6). */
export const TAMANHO_MAXIMO_BYTES = 20_000_000;

/** Único MIME aceito no MVP; a assinatura `%PDF-` é verificada no servidor, não a extensão. */
export const MIME_ACEITO = "application/pdf";

/** Reserva de envio não finalizada expira após este prazo (design-tecnico.md §1.4). */
export const RESERVA_VALIDADE_HORAS = 24;

export interface ReservaEnvio {
  versaoId: string;
  objetoPermitido: string;
  expiraEm: string;
}

export interface VersaoArquivo {
  versaoId: string;
  estadoRecebimento: EstadoRecebimento;
  estadoArmazenamento: EstadoArmazenamento;
  recebidoEm?: string;
  nomeOriginal: string;
  tamanhoBytes: number;
}

/**
 * Porta de envio de arquivo. Reservar → escrever (TUS) → finalizar → consultar.
 * Nenhuma implementação desta porta aceita caminho/URL arbitrário do chamador — o objeto
 * permitido vem sempre da reserva criada pelo servidor (ADR-0019).
 */
export interface EnvioArquivoPort {
  reservar(input: {
    solicitacaoId?: string;
    pagamentoId?: string;
    contratoId?: string;
    nomeArquivo: string;
    tamanhoBytes: number;
    mime: string;
  }): Promise<ReservaEnvio>;

  finalizar(input: {
    versaoId: string;
    idempotencyKey: string;
    revisaoEsperada: number;
  }): Promise<VersaoArquivo>;

  consultar(versaoId: string): Promise<VersaoArquivo>;
}
