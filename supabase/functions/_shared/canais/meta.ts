// _shared/canais/meta.ts — WhatsApp Cloud API e Instagram Direct (Messenger Platform), via Graph API.
// Formatos conferidos nos projetos de referência (Atendimento: webhooks; heziomos: envio).
import { constantTimeEqual } from "../crypto.ts";
import {
  type Buscador,
  type EntradaCanal,
  ErroProvedor,
  LIMITE_TEXTO_ENTRADA,
  objeto,
} from "./tipos.ts";

// Versão ÚNICA da Graph API. A Meta dá cerca de dois anos a cada versão e uma versão vencida não
// devolve erro: a chamada "pode ser promovida" em silêncio, com comportamento indefinido. Olhe
// META_GRAPH_REVIEW_BY. (Mesma política e mesma versão do heziomos/_shared/meta-graph-version.ts.)
export const META_GRAPH_VERSION = "v26.0";
export const META_GRAPH_REVIEW_BY = "2028-07-01";
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

const TIMEOUT_MS = 15_000;

/**
 * GET de verificação do webhook: a Meta manda `hub.mode=subscribe`, o `hub.verify_token` que o
 * administrador cadastrou no painel e um `hub.challenge` que deve voltar em texto puro.
 */
export function responderDesafio(url: URL, verifyTokenEsperado: string): Response {
  const modo = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const desafio = url.searchParams.get("hub.challenge");
  const recusado = new Response(JSON.stringify({ ok: false }), {
    status: 403,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  if (modo !== "subscribe" || !token || !desafio || desafio.length > 4096) return recusado;
  if (!verifyTokenEsperado || !constantTimeEqual(token, verifyTokenEsperado)) return recusado;
  return new Response(desafio, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function nomesDosContatos(valor: Record<string, unknown>): Map<string, string> {
  const nomes = new Map<string, string>();
  if (!Array.isArray(valor.contacts)) return nomes;
  for (const bruto of valor.contacts) {
    const contato = objeto(bruto);
    const perfil = objeto(contato.profile);
    if (typeof contato.wa_id === "string" && typeof perfil.name === "string" && perfil.name.trim()) {
      nomes.set(contato.wa_id, perfil.name.trim());
    }
  }
  return nomes;
}

function iso(segundos: unknown): string {
  const n = typeof segundos === "string" ? Number(segundos) : segundos;
  return typeof n === "number" && Number.isFinite(n) && n > 0
    ? new Date(n * 1000).toISOString()
    : new Date().toISOString();
}

export interface ContaWhatsAppOficial {
  wabaId: string;
  phoneNumberId: string;
}

/**
 * Mensagens de TEXTO de um webhook do WhatsApp Cloud API, só da conta e do número esperados.
 * Status de entrega, mídia, reações e entregas para outro número são ignorados.
 */
export function lerEntradasWhatsApp(payload: unknown, conta: ContaWhatsAppOficial): EntradaCanal[] {
  const raiz = objeto(payload);
  if (raiz.object !== "whatsapp_business_account" || !Array.isArray(raiz.entry)) return [];
  const saida: EntradaCanal[] = [];
  for (const entradaBruta of raiz.entry) {
    const entrada = objeto(entradaBruta);
    if (entrada.id !== conta.wabaId || !Array.isArray(entrada.changes)) continue;
    for (const mudancaBruta of entrada.changes) {
      const mudanca = objeto(mudancaBruta);
      const valor = objeto(mudanca.value);
      if (mudanca.field !== "messages") continue;
      if (objeto(valor.metadata).phone_number_id !== conta.phoneNumberId) continue;
      if (!Array.isArray(valor.messages)) continue;
      const nomes = nomesDosContatos(valor);
      for (const mensagemBruta of valor.messages) {
        const mensagem = objeto(mensagemBruta);
        const corpo = objeto(mensagem.text).body;
        if (
          mensagem.type !== "text" ||
          typeof mensagem.id !== "string" || !mensagem.id || mensagem.id.length > 256 ||
          typeof mensagem.from !== "string" || !/^[0-9]{4,64}$/.test(mensagem.from) ||
          typeof corpo !== "string" || !corpo.trim()
        ) continue;
        saida.push({
          origemId: mensagem.id,
          contatoExterno: mensagem.from,
          nome: nomes.get(mensagem.from) ?? null,
          texto: corpo.trim().slice(0, LIMITE_TEXTO_ENTRADA),
          ocorridoEm: iso(mensagem.timestamp),
        });
      }
    }
  }
  return saida;
}

export interface ContaInstagram {
  igAccountId: string;
}

/**
 * Direct de TEXTO de um webhook do Instagram, só da conta esperada. Ecos (mensagem enviada pela
 * própria conta, que a Meta devolve se a assinatura inclui `message_echoes`) são ignorados: sem
 * isso o agente responderia a si mesmo em laço.
 */
export function lerEntradasInstagram(payload: unknown, conta: ContaInstagram): EntradaCanal[] {
  const raiz = objeto(payload);
  if (raiz.object !== "instagram" || !Array.isArray(raiz.entry)) return [];
  const saida: EntradaCanal[] = [];
  for (const entradaBruta of raiz.entry) {
    const entrada = objeto(entradaBruta);
    if (entrada.id !== conta.igAccountId || !Array.isArray(entrada.messaging)) continue;
    for (const itemBruto of entrada.messaging) {
      const item = objeto(itemBruto);
      const remetente = objeto(item.sender).id;
      const mensagem = objeto(item.message);
      if (
        mensagem.is_echo === true ||
        typeof remetente !== "string" || !/^[0-9]{4,64}$/.test(remetente) ||
        remetente === conta.igAccountId ||
        typeof mensagem.mid !== "string" || !mensagem.mid || mensagem.mid.length > 256 ||
        typeof mensagem.text !== "string" || !mensagem.text.trim()
      ) continue;
      const ms = typeof item.timestamp === "number" ? item.timestamp : null;
      saida.push({
        origemId: mensagem.mid,
        contatoExterno: remetente,
        nome: null,
        texto: mensagem.text.trim().slice(0, LIMITE_TEXTO_ENTRADA),
        ocorridoEm: ms && ms > 0 ? new Date(ms).toISOString() : new Date().toISOString(),
      });
    }
  }
  return saida;
}

async function postGraph(
  buscador: Buscador,
  provedor: string,
  caminho: string,
  accessToken: string,
  corpo: Record<string, unknown>,
): Promise<void> {
  const resposta = await buscador(`${META_GRAPH_BASE}/${caminho}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(corpo),
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!resposta.ok) throw new ErroProvedor(provedor, resposta.status);
}

export function enviarWhatsAppOficial(
  buscador: Buscador,
  a: { accessToken: string; phoneNumberId: string; para: string; texto: string },
): Promise<void> {
  return postGraph(
    buscador,
    "meta-whatsapp",
    `${encodeURIComponent(a.phoneNumberId)}/messages`,
    a.accessToken,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: a.para.replace(/\D/g, ""),
      type: "text",
      text: { preview_url: false, body: a.texto },
    },
  );
}

/** Messenger Platform com o Page Access Token: `/me/messages` (a conta IG está ligada a uma Página). */
export function enviarInstagram(
  buscador: Buscador,
  a: { accessToken: string; para: string; texto: string },
): Promise<void> {
  return postGraph(buscador, "meta-instagram", "me/messages", a.accessToken, {
    recipient: { id: a.para },
    message: { text: a.texto },
  });
}
