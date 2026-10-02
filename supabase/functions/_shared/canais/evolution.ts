// _shared/canais/evolution.ts — Evolution API v2 (WhatsApp via Baileys).
// Formatos validados em produção no projeto Atendimento: sendText com `{number, text}` e
// webhook/set com `{webhook:{…}}`. A v1 (`textMessage`, corpo "plano") NÃO é aceita pela v2: foi o
// que o E13-S12 escreveu e por isso o agente nunca respondeu (achado A-19).
import {
  type Buscador,
  type EntradaCanal,
  ErroProvedor,
  LIMITE_TEXTO_ENTRADA,
  objeto,
  texto,
} from "./tipos.ts";

const TIMEOUT_MS = 15_000;

function soDigitos(valor: string): string {
  return valor.replace(/@.+$/, "").replace(/\D/g, "");
}

/**
 * Mensagem de texto de um evento `messages.upsert`. Ignora grupo, mensagem da própria conta, mídia
 * sem texto e remetente sem número resolvível (endereço `@lid` sem o número alternativo).
 */
export function lerEntradaEvolution(payload: unknown): EntradaCanal | null {
  const raiz = objeto(payload);
  const evento = texto(raiz.event)?.toUpperCase().replace(/[.-]/g, "_");
  if (evento !== "MESSAGES_UPSERT") return null;

  const dados = objeto(raiz.data);
  const chave = objeto(dados.key);
  const origemId = texto(chave.id);
  let remoto = texto(chave.remoteJid);
  if (!remoto || !origemId || remoto.endsWith("@g.us") || chave.fromMe === true) return null;
  if (remoto.endsWith("@lid")) {
    // Endereçamento por LID: o número vem em campo alternativo, quando a Evolution o entrega.
    remoto = texto(chave.remoteJidAlt) ?? texto(chave.senderPn) ?? texto(dados.senderPn);
    if (!remoto) return null;
  }

  const mensagem = objeto(dados.message);
  const corpo = texto(mensagem.conversation) ?? texto(objeto(mensagem.extendedTextMessage).text);
  const numero = soDigitos(remoto);
  if (!corpo || numero.length < 8 || numero.length > 20) return null;

  const ts = dados.messageTimestamp;
  const segundos = typeof ts === "string" ? Number(ts) : ts;
  return {
    origemId,
    contatoExterno: numero,
    nome: texto(dados.pushName),
    texto: corpo.slice(0, LIMITE_TEXTO_ENTRADA),
    ocorridoEm: typeof segundos === "number" && Number.isFinite(segundos) && segundos > 0
      ? new Date(segundos * 1000).toISOString()
      : new Date().toISOString(),
  };
}

function baseSemBarra(url: string): string {
  return url.replace(/\/+$/, "");
}

export async function enviarEvolution(
  buscador: Buscador,
  a: { baseUrl: string; apiKey: string; instancia: string; numero: string; texto: string },
): Promise<void> {
  const resposta = await buscador(
    `${baseSemBarra(a.baseUrl)}/message/sendText/${encodeURIComponent(a.instancia)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: a.apiKey },
      body: JSON.stringify({ number: a.numero.replace(/\D/g, ""), text: a.texto }),
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!resposta.ok) throw new ErroProvedor("evolution", resposta.status);
}

export async function registrarWebhookEvolution(
  buscador: Buscador,
  a: { baseUrl: string; apiKey: string; instancia: string; urlWebhook: string; token: string },
): Promise<void> {
  const resposta = await buscador(
    `${baseSemBarra(a.baseUrl)}/webhook/set/${encodeURIComponent(a.instancia)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: a.apiKey },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: a.urlWebhook,
          headers: { "x-akros-webhook": a.token },
          events: ["MESSAGES_UPSERT"],
          webhookBase64: false,
        },
      }),
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    },
  );
  if (!resposta.ok) throw new ErroProvedor("evolution", resposta.status);
}
