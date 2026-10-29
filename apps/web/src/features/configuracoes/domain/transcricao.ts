// E13-S15 (ADR-0022) — transcrição de áudio recebido por canal. Tipos puros, sem I/O. A chave do
// provedor NUNCA aparece aqui: o front só conhece o indício de 4 caracteres.

export type ProvedorTranscricao = "groq" | "openrouter";

/**
 * Provedores e modelos oferecidos na tela. O servidor ainda confere na lista do próprio provedor se
 * o modelo existe para a chave; esta lista só evita erro de digitação. A OpenAI não entra: o
 * `whisper-1` está descontinuado e o contrato do modelo novo ainda não foi provado (ADR-0022).
 */
export const PROVEDORES_TRANSCRICAO: Record<
  ProvedorTranscricao,
  { modeloPadrao: string; modelos: readonly string[] }
> = {
  groq: {
    modeloPadrao: "whisper-large-v3-turbo",
    modelos: ["whisper-large-v3-turbo", "whisper-large-v3"],
  },
  openrouter: { modeloPadrao: "openai/whisper-large-v3", modelos: ["openai/whisper-large-v3"] },
};

/** `auto` = o modelo detecta o idioma (cliente pode falar PT ou EN). */
export const IDIOMAS_TRANSCRICAO = ["auto", "pt", "en", "es"] as const;
export type IdiomaTranscricao = (typeof IDIOMAS_TRANSCRICAO)[number];

export interface TranscricaoAudio {
  provedor: ProvedorTranscricao;
  modelo: string;
  /** ISO 639-1 ou `null` (detecção automática). */
  idioma: string | null;
  /** Últimos 4 caracteres da chave, só para reconhecer qual é. */
  indicio: string;
  ativa: boolean;
  /** Quando o admin confirmou que o áudio dos clientes sai para o provedor. */
  aceiteEnvioEm: string | null;
  /** Quando chave e modelo foram verificados no provedor. */
  verificadaEm: string | null;
}

export interface EntradaTranscricao {
  provedor: ProvedorTranscricao;
  modelo: string;
  idioma: string | null;
  /** Vazia = manter a chave guardada (só vale se o provedor não mudou). */
  apiKey: string;
  aceiteEnvioDados: boolean;
}

/** Onde o admin está: UM botão principal por vez. */
export type PassoTranscricao = "configurar" | "testar" | "ligar" | "ligada";

export function passoDaTranscricao(c: TranscricaoAudio | null): PassoTranscricao {
  if (!c) return "configurar";
  if (c.ativa) return "ligada";
  return c.verificadaEm && c.aceiteEnvioEm ? "ligar" : "testar";
}

/** Já existe aceite para ESTE provedor? Outro provedor é outra parte recebendo o áudio. */
export function aceiteVale(c: TranscricaoAudio | null, provedor: ProvedorTranscricao): boolean {
  return !!c && c.provedor === provedor && c.aceiteEnvioEm !== null;
}

/** A chave precisa ser informada de novo? (primeira vez ou outro provedor) */
export function exigeChave(c: TranscricaoAudio | null, provedor: ProvedorTranscricao): boolean {
  return !c || c.provedor !== provedor;
}
