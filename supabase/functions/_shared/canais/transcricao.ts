// _shared/canais/transcricao.ts — transcrição de áudio recebido por canal (E13-S15, ADR-0022).
// Referência de comportamento: TriviAtende `transcrever-audio/adapter.ts`, mas o contrato foi
// conferido na documentação oficial de cada provedor (o do TriviAtende não foi testado ponta a ponta).
//
// Segurança: os endereços são CONSTANTES (nada que o admin digite vira URL: sem SSRF); `redirect:
// "error"`; timeout; o erro carrega só um código — NUNCA o corpo, o texto do cliente nem a chave.
import { LIMITE_ANEXO_BYTES } from "./anexo.ts";
import { type Buscador, LIMITE_TEXTO_ENTRADA } from "./tipos.ts";

export type ProvedorTranscricao = "groq" | "openrouter";

interface DadosProvedor {
  /** Endpoint multipart compatível com a OpenAI. */
  transcricoes: string;
  /** Lista de modelos de transcrição (prova que o modelo existe para esta conta). */
  modelos: string;
  /** Rota que valida a chave sem custo, quando a lista de modelos é pública. */
  chave: string | null;
  modeloPadrao: string;
}

export const PROVEDORES_TRANSCRICAO: Record<ProvedorTranscricao, DadosProvedor> = {
  groq: {
    transcricoes: "https://api.groq.com/openai/v1/audio/transcriptions",
    modelos: "https://api.groq.com/openai/v1/models",
    chave: null,
    modeloPadrao: "whisper-large-v3-turbo",
  },
  openrouter: {
    transcricoes: "https://openrouter.ai/api/v1/audio/transcriptions",
    modelos: "https://openrouter.ai/api/v1/models?output_modalities=transcription",
    chave: "https://openrouter.ai/api/v1/key",
    modeloPadrao: "openai/whisper-large-v3",
  },
};

export const MODELO_VALIDO = /^[A-Za-z0-9._/-]{1,80}$/;
export const IDIOMA_VALIDO = /^[a-z]{2}$/;

/** Formatos que a Evolution entrega e o bucket aceita; o provedor infere o formato pela extensão. */
const EXTENSAO_DO_MIME: Readonly<Record<string, string>> = {
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/webm": "webm",
};

export type CodigoTranscricao =
  | "audio_invalido"
  | "chave_recusada"
  | "modelo_indisponivel"
  | "limite_do_provedor"
  | "tempo_esgotado"
  | "provedor_indisponivel"
  | "resposta_invalida"
  | "sem_fala";

export class ErroTranscricao extends Error {
  constructor(public readonly codigo: CodigoTranscricao) {
    super(`transcricao: ${codigo}`);
  }
}

export interface EntradaTranscricao {
  buscador: Buscador;
  provedor: ProvedorTranscricao;
  modelo: string;
  chave: string;
  /** ISO 639-1; `null` deixa o modelo detectar (cliente pode falar PT ou EN). */
  idioma: string | null;
  audio: Uint8Array;
  mime: string;
  tetoMs?: number;
}

export interface ResultadoTranscricao {
  texto: string;
  segundos: number | null;
}

const TETO_PADRAO_MS = 20_000;
const LIMITE_RESPOSTA_BYTES = 1024 * 1024;

function falhaDeStatus(status: number): ErroTranscricao {
  if (status === 401 || status === 403) return new ErroTranscricao("chave_recusada");
  if (status === 402 || status === 429) return new ErroTranscricao("limite_do_provedor");
  if (status === 404) return new ErroTranscricao("modelo_indisponivel");
  return new ErroTranscricao("provedor_indisponivel");
}

async function chamar(buscador: Buscador, url: string, init: RequestInit, tetoMs: number): Promise<Response> {
  let resposta: Response;
  try {
    resposta = await buscador(url, { ...init, redirect: "error", signal: AbortSignal.timeout(tetoMs) });
  } catch (erro) {
    throw new ErroTranscricao(erro instanceof Error && erro.name === "TimeoutError" ? "tempo_esgotado" : "provedor_indisponivel");
  }
  if (!resposta.ok) {
    await resposta.body?.cancel().catch(() => {});
    throw falhaDeStatus(resposta.status);
  }
  return resposta;
}

async function lerJson(resposta: Response): Promise<Record<string, unknown>> {
  const declarado = Number(resposta.headers.get("content-length") ?? 0);
  if (declarado > LIMITE_RESPOSTA_BYTES) throw new ErroTranscricao("resposta_invalida");
  try {
    const texto = await resposta.text();
    if (texto.length > LIMITE_RESPOSTA_BYTES) throw new Error("grande");
    const corpo = JSON.parse(texto);
    if (typeof corpo !== "object" || corpo === null || Array.isArray(corpo)) throw new Error("forma");
    return corpo as Record<string, unknown>;
  } catch {
    throw new ErroTranscricao("resposta_invalida");
  }
}

export function extensaoDoAudio(mime: string): string | null {
  return EXTENSAO_DO_MIME[mime] ?? null;
}

/** Texto longo demais seria recusado pelo registro da mensagem (e a Evolution reentregaria para sempre). */
function limitarTexto(texto: string): string {
  return texto.length <= LIMITE_TEXTO_ENTRADA ? texto : `${texto.slice(0, LIMITE_TEXTO_ENTRADA - 1)}…`;
}

export async function transcrever(e: EntradaTranscricao): Promise<ResultadoTranscricao> {
  const extensao = extensaoDoAudio(e.mime);
  if (!extensao || e.audio.byteLength === 0 || e.audio.byteLength > LIMITE_ANEXO_BYTES) {
    throw new ErroTranscricao("audio_invalido");
  }
  const corpo = new FormData();
  // `slice()` copia para um ArrayBuffer próprio (o tipo `Uint8Array` genérico pode ser SharedArrayBuffer).
  corpo.set("file", new Blob([e.audio.slice()], { type: e.mime }), `audio.${extensao}`);
  corpo.set("model", e.modelo);
  corpo.set("response_format", "json");
  if (e.idioma) corpo.set("language", e.idioma);

  const resposta = await chamar(
    e.buscador,
    PROVEDORES_TRANSCRICAO[e.provedor].transcricoes,
    { method: "POST", headers: { authorization: `Bearer ${e.chave}` }, body: corpo },
    e.tetoMs ?? TETO_PADRAO_MS,
  );
  const dados = await lerJson(resposta);
  if (typeof dados.text !== "string") throw new ErroTranscricao("resposta_invalida");
  const texto = dados.text.trim();
  if (!texto) throw new ErroTranscricao("sem_fala");
  const uso = typeof dados.usage === "object" && dados.usage !== null ? (dados.usage as Record<string, unknown>) : {};
  const segundos = typeof uso.seconds === "number" && Number.isFinite(uso.seconds) && uso.seconds >= 0 ? uso.seconds : null;
  return { texto: limitarTexto(texto), segundos };
}

export interface EntradaVerificacao {
  buscador: Buscador;
  provedor: ProvedorTranscricao;
  modelo: string;
  chave: string;
  tetoMs?: number;
}

/**
 * Prova, sem gastar transcrição, que a chave vale e que o modelo existe para esta conta.
 * NÃO prova a transcrição em si: isso só um áudio real prova (homologação).
 */
export async function verificarProvedor(e: EntradaVerificacao): Promise<void> {
  const dados = PROVEDORES_TRANSCRICAO[e.provedor];
  const teto = e.tetoMs ?? TETO_PADRAO_MS;
  const autorizado = { method: "GET", headers: { authorization: `Bearer ${e.chave}` } };
  if (dados.chave) await chamar(e.buscador, dados.chave, autorizado, teto);
  const lista = await lerJson(await chamar(e.buscador, dados.modelos, autorizado, teto));
  const ids = Array.isArray(lista.data)
    ? lista.data.map((m) => (typeof m === "object" && m !== null ? (m as { id?: unknown }).id : null))
    : [];
  if (!ids.includes(e.modelo)) throw new ErroTranscricao("modelo_indisponivel");
}
