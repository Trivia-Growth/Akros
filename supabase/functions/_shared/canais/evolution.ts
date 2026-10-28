// _shared/canais/evolution.ts — leitura de eventos do webhook da Evolution API v2 (E13-S15).
// Só interpreta payload JÁ AUTENTICADO. Puro: sem rede, sem banco, sem segredo.
//
// Regra do projeto (FR-016/SC-009): nenhuma mensagem individual é descartada em silêncio. Só são
// ignorados grupo, broadcast/status, mensagem da própria conta, reação, protocolo (apagar/editar)
// e mensagem sem conteúdo; todo o resto vira mensagem — texto, anexo, aviso ou "contato não
// identificado".
import { LIMITE_TEXTO_ENTRADA, objeto, texto } from "./tipos.ts";

export type TipoMidia = "imagem" | "audio" | "arquivo" | "video";

export interface MidiaRecebida {
  tipo: TipoMidia;
  mime: string;
  nome: string;
  tamanhoBytes: number | null;
  legenda: string | null;
}

export type ConteudoEvolution =
  | { kind: "texto"; texto: string }
  | { kind: "midia"; midia: MidiaRecebida }
  | { kind: "aviso"; texto: string };

/**
 * `telefone` só existe com PROVA (campo do próprio evento). `lid` é o endereço interno do WhatsApp,
 * usado só para buscar o par no histórico da instância. `referenciaNaoIdentificada` identifica a
 * conversa quando não há telefone comprovado.
 */
export interface RemetenteEvolution {
  telefone: string | null;
  lid: string | null;
  referenciaNaoIdentificada: string | null;
}

export type EventoEvolution =
  | { tipo: "ignorar"; motivo: string }
  | { tipo: "reconhecido"; evento: string }
  | { tipo: "conexao"; estado: "open" | "close" | "connecting" | "desconhecido" }
  | {
    tipo: "mensagem";
    origemId: string;
    remetente: RemetenteEvolution;
    nome: string | null;
    ocorridoEm: string;
    conteudo: ConteudoEvolution;
  };

export function normalizarNomeDoEvento(evento: unknown): string | null {
  return typeof evento === "string" && evento.trim() ? evento.trim().replace(/[.-]/g, "_").toUpperCase() : null;
}

const EVENTOS_APENAS_RECONHECIDOS = new Set(["QRCODE_UPDATED", "MESSAGES_UPDATE", "SEND_MESSAGE"]);

/** `5511999990000`, `5511999990000:16` (dispositivo) em `@s.whatsapp.net`. LID nunca é telefone. */
function telefoneDoJid(jid: unknown): string | null {
  if (typeof jid !== "string") return null;
  return /^(\d{8,15})(?::\d{1,5})?@s\.whatsapp\.net$/.exec(jid)?.[1] ?? null;
}

export function lidDoJid(jid: unknown): string | null {
  if (typeof jid !== "string") return null;
  const digitos = /^(\d{8,20})@lid$/.exec(jid)?.[1];
  return digitos ? `${digitos}@lid` : null;
}

export function identificarRemetente(
  chave: Record<string, unknown>,
  dados: Record<string, unknown>,
): RemetenteEvolution | null {
  const remoto = chave.remoteJid;
  const principal = telefoneDoJid(remoto);
  const alternativo = telefoneDoJid(chave.remoteJidAlt);
  const remetente = telefoneDoJid(chave.senderPn) ?? telefoneDoJid(dados.senderPn);
  const candidatos = new Set([principal, alternativo, remetente].filter((v): v is string => v !== null));
  const digitosDoJid = typeof remoto === "string" ? remoto.replace(/@.*$/, "").replace(/\D/g, "") : "";

  if (candidatos.size > 1) {
    // Campos do próprio evento discordam: não há prova de quem é.
    return { telefone: null, lid: lidDoJid(remoto), referenciaNaoIdentificada: `conflito:${digitosDoJid || "x"}` };
  }
  const unico = [...candidatos][0] ?? null;
  if (principal !== null) return { telefone: principal, lid: null, referenciaNaoIdentificada: null };

  const lid = lidDoJid(remoto);
  if (lid !== null) {
    return {
      telefone: unico,
      lid,
      referenciaNaoIdentificada: unico === null ? `lid:${lid.replace("@lid", "")}` : null,
    };
  }
  if (!digitosDoJid) return null;
  return { telefone: unico, lid: null, referenciaNaoIdentificada: unico === null ? `jid:${digitosDoJid.slice(0, 40)}` : null };
}

const MIME_PARA_EXTENSAO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/3gpp": "3gp",
};

function mimeLimpo(valor: unknown, padrao: string): string {
  const bruto = texto(valor);
  return (bruto ? bruto.split(";")[0].trim().toLowerCase() : padrao) || padrao;
}

function tamanho(valor: unknown): number | null {
  const n = typeof valor === "string" ? Number(valor) : valor;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null;
}

function nomeSeguro(bruto: string | null, padrao: string): string {
  const base = (bruto ?? padrao).replace(/[\\/\u0000-\u001f]/g, "_").trim().slice(0, 120);
  return base || padrao;
}

const ENVOLTORIOS = ["ephemeralMessage", "viewOnceMessage", "viewOnceMessageV2", "viewOnceMessageV2Extension", "documentWithCaptionMessage"];

function desembrulhar(mensagem: Record<string, unknown>): Record<string, unknown> {
  let atual = mensagem;
  for (let i = 0; i < 4; i++) {
    const envoltorio = ENVOLTORIOS.find((n) => objeto(objeto(atual[n]).message) && Object.keys(objeto(objeto(atual[n]).message)).length > 0);
    if (!envoltorio) break;
    atual = objeto(objeto(atual[envoltorio]).message);
  }
  return atual;
}

const SEM_CONTEUDO = new Set([
  "protocolMessage",
  "reactionMessage",
  "encReactionMessage",
  "senderKeyDistributionMessage",
  "messageContextInfo",
  "pollUpdateMessage",
  "keepInChatMessage",
  "editedMessage",
]);

function conteudoDaMensagem(bruta: Record<string, unknown>, origemId: string): ConteudoEvolution | null {
  const m = desembrulhar(bruta);
  const chaves = Object.keys(m).filter((k) => m[k] !== undefined && m[k] !== null);
  if (chaves.length === 0 || chaves.every((k) => SEM_CONTEUDO.has(k))) return null;

  const corpo = texto(m.conversation) ?? texto(objeto(m.extendedTextMessage).text);
  if (corpo) return { kind: "texto", texto: corpo.slice(0, LIMITE_TEXTO_ENTRADA) };

  const midia = (tipo: TipoMidia, campo: string, prefixo: string, padraoMime: string): ConteudoEvolution => {
    const o = objeto(m[campo]);
    const mime = mimeLimpo(o.mimetype ?? o.mimeType, padraoMime);
    const extensao = MIME_PARA_EXTENSAO[mime] ?? "bin";
    const nome = nomeSeguro(texto(o.fileName) ?? texto(o.title), `${prefixo}-${origemId}.${extensao}`);
    const legenda = texto(o.caption);
    return {
      kind: "midia",
      midia: {
        tipo,
        mime,
        nome,
        tamanhoBytes: tamanho(o.fileLength),
        legenda: legenda ? legenda.slice(0, LIMITE_TEXTO_ENTRADA) : null,
      },
    };
  };
  if (m.imageMessage) return midia("imagem", "imageMessage", "imagem", "image/jpeg");
  if (m.documentMessage) return midia("arquivo", "documentMessage", "documento", "application/octet-stream");
  if (m.audioMessage) return midia("audio", "audioMessage", "audio", "audio/ogg");
  if (m.videoMessage) return midia("video", "videoMessage", "video", "video/mp4");
  if (m.stickerMessage) return { kind: "aviso", texto: "[Figurinha recebida]" };
  if (m.contactMessage || m.contactsArrayMessage) return { kind: "aviso", texto: "[Contato compartilhado]" };
  if (m.locationMessage || m.liveLocationMessage) return { kind: "aviso", texto: "[Localização compartilhada]" };
  if (chaves.some((k) => !SEM_CONTEUDO.has(k) && k !== "conversation" && k !== "extendedTextMessage")) {
    return { kind: "aviso", texto: "[Mensagem de tipo não suportado]" };
  }
  return null; // texto vazio
}

function ocorridoEm(valor: unknown): string {
  const n = typeof valor === "string" ? Number(valor) : valor;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? new Date(n * 1000).toISOString() : new Date().toISOString();
}

export function classificarEventoEvolution(payload: unknown): EventoEvolution {
  const raiz = objeto(payload);
  const evento = normalizarNomeDoEvento(raiz.event);
  if (!evento) return { tipo: "ignorar", motivo: "sem_evento" };

  if (evento === "CONNECTION_UPDATE") {
    const estado = texto(objeto(raiz.data).state)?.toLowerCase();
    return {
      tipo: "conexao",
      estado: estado === "open" || estado === "close" || estado === "connecting" ? estado : "desconhecido",
    };
  }
  if (EVENTOS_APENAS_RECONHECIDOS.has(evento)) return { tipo: "reconhecido", evento };
  if (evento !== "MESSAGES_UPSERT") return { tipo: "ignorar", motivo: "evento_desconhecido" };

  const dados = objeto(raiz.data);
  const chave = objeto(dados.key);
  const origemId = texto(chave.id);
  const remoto = texto(chave.remoteJid);
  if (!origemId || !remoto) return { tipo: "ignorar", motivo: "sem_identificador" };
  if (chave.fromMe === true) return { tipo: "ignorar", motivo: "propria_conta" };
  if (remoto.endsWith("@g.us") || remoto.endsWith("@broadcast") || remoto === "status@broadcast") {
    return { tipo: "ignorar", motivo: "grupo_ou_status" };
  }

  const conteudo = conteudoDaMensagem(objeto(dados.message), origemId.slice(0, 80));
  if (!conteudo) return { tipo: "ignorar", motivo: "sem_conteudo" };
  const remetente = identificarRemetente(chave, dados);
  if (!remetente) return { tipo: "ignorar", motivo: "remetente_invalido" };

  return {
    tipo: "mensagem",
    origemId,
    remetente,
    nome: texto(dados.pushName),
    ocorridoEm: ocorridoEm(dados.messageTimestamp),
    conteudo,
  };
}
