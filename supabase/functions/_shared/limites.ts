// _shared/limites.ts — E03-S07 / ADR-0019. Espelha apps/web/src/shared/contracts/arquivo.ts.
// Os dois runtimes (browser e Deno) duplicam estas constantes de propósito — mantenha-as iguais;
// ver design-tecnico.md §6 "Limites fixados".

/** Limite de tamanho de PDF aceito pela plataforma. */
export const TAMANHO_MAXIMO_BYTES = 20_000_000;

/** Único MIME aceito no MVP; a assinatura `%PDF-` é verificada no servidor, não a extensão. */
export const MIME_ACEITO = "application/pdf";

/** Reserva de envio não finalizada expira após este prazo. */
export const RESERVA_VALIDADE_HORAS = 24;

/** Fragmento de upload ao Microsoft Graph — múltiplo de 320 KiB. */
export const FRAGMENTO_TRANSFERENCIA_BYTES = 5 * 1024 * 1024;

/** Lease do trabalho de transferência. */
export const LEASE_TRABALHO_MINUTOS = 5;

/** Backoff máximo entre tentativas de transferência. */
export const BACKOFF_MAXIMO_MINUTOS = 60;

/** Página da carteira (crm.carteira_casos). */
export const CARTEIRA_PAGINA_TAMANHO = 50;

/** Janela de "vencimento próximo" nas projeções financeiras. */
export const VENCIMENTO_PROXIMO_DIAS = 7;
