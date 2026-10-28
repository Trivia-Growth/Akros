// _shared/canais/evolution-cliente.ts — chamadas HTTP à Evolution API v2 (E13-S15).
// Contrato de referência: TriviAtende (`evolution-configurar`, `evolution-pareamento`,
// `evolution-webhook`) e fonte oficial da Evolution. É HIPÓTESE até o smoke contra o servidor do
// Akros (`scripts/evolution-contract-smoke.mjs`): por isso toda chamada passa por aqui e só aqui.
//
// Segurança: toda URL é revalidada (`validar`) antes da chamada; `redirect: "error"`; timeout;
// o erro carrega só um código e o status — NUNCA o corpo (pode ter telefone, texto ou eco de chave).
import { CABECALHO_DO_WEBHOOK } from "./evolution-estado.ts";
import { type Buscador } from "./tipos.ts";

export class ErroEvolution extends Error {
  constructor(public readonly codigo: string, public readonly status?: number) {
    super(`evolution: ${codigo}${status ? ` (${status})` : ""}`);
  }
}

export interface ConfigWebhook {
  url: string;
  /** Cabeçalho secreto exigido na entrega. Nunca `jwt_key` (o servidor o consome). */
  cabecalhos: Record<string, string>;
  eventos: readonly string[];
  base64: boolean;
}

export interface ClienteEvolution {
  versao(): Promise<string>;
  criarInstancia(nome: string): Promise<{ jaExistia: boolean }>;
  /** Grava e RELÊ; só resolve se a leitura remota confere. */
  configurarWebhook(nome: string, config: ConfigWebhook): Promise<void>;
  conectar(nome: string): Promise<{ qrBase64: string }>;
  estado(nome: string): Promise<{ estado: string }>;
  /** Dígitos do número pareado (de `fetchInstances.ownerJid`) ou `null`. */
  numeroPareado(nome: string): Promise<string | null>;
  /** Telefone de um LID, só se EXATAMENTE um par comprovado existir no histórico da instância. */
  telefoneDoLid(nome: string, lid: string): Promise<string | null>;
  baixarMidia(nome: string, origemId: string, limiteBytes: number): Promise<{ base64: string; mime: string | null; nome: string | null }>;
  enviarTexto(nome: string, numero: string, texto: string): Promise<void>;
  apagarInstancia(nome: string): Promise<void>;
}

export interface OpcoesCliente {
  buscador: Buscador;
  baseUrl: string;
  apiKey: string;
  /** Revalida o destino a cada chamada (SSRF/DNS rebinding). Lança se recusar. */
  validar?: (url: string) => Promise<void>;
  timeoutMs?: number;
}

function objeto(valor: unknown): Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};
}

function digitosDoJid(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const d = valor.split("@")[0]?.split(":")[0]?.replace(/\D/g, "") ?? "";
  return d.length >= 8 && d.length <= 15 ? d : null;
}

/** A Evolution pode responder 2xx a `webhook/set` sem aplicar: só vale o que a leitura confirma. */
export function webhookConfere(corpo: unknown, esperado: ConfigWebhook): boolean {
  const raiz = objeto(corpo);
  const w = objeto(raiz.webhook ?? raiz); // 2.3.x devolve plano; outras versões embrulham em `webhook`
  if (w.enabled !== true || w.url !== esperado.url) return false;
  // `base64` ligado estouraria o limite do corpo do webhook e perderia mensagem: nunca aceitar.
  const base64 = w.webhookBase64 ?? w.base64;
  if (base64 === true || (base64 !== undefined && base64 !== false)) return false;
  if (esperado.base64 === true) return false;
  const eventos = w.events;
  if (!Array.isArray(eventos) || !esperado.eventos.every((e) => eventos.includes(e))) return false;
  const cabecalhos = objeto(w.headers);
  return Object.entries(esperado.cabecalhos).every(([nome, valor]) => cabecalhos[nome] === valor);
}

/** Lê o corpo em pedaços e ABANDONA ao passar do teto: resposta sem Content-Length não esgota a memória. */
async function lerTextoComTeto(resposta: Response, teto: number): Promise<string> {
  if (!resposta.body) return "";
  const leitor = resposta.body.getReader();
  const decodificador = new TextDecoder();
  let texto = "";
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    texto += decodificador.decode(value, { stream: true });
    if (texto.length > teto) {
      await leitor.cancel().catch(() => {});
      throw new ErroEvolution("midia_grande");
    }
  }
  return texto + decodificador.decode();
}

export function criarClienteEvolution(opcoes: OpcoesCliente): ClienteEvolution {
  const base = opcoes.baseUrl.replace(/\/+$/, "");
  const timeout = opcoes.timeoutMs ?? 15_000;

  async function chamar(caminho: string, init: RequestInit = {}, codigoFalha = "chamada_falhou"): Promise<Response> {
    const url = `${base}${caminho}`;
    if (opcoes.validar) {
      try {
        await opcoes.validar(base); // a BASE é o que se valida (a URL da chamada leva consulta)
      } catch {
        throw new ErroEvolution("url_recusada");
      }
    }
    let resposta: Response;
    try {
      resposta = await opcoes.buscador(url, {
        ...init,
        headers: { apikey: opcoes.apiKey, "Content-Type": "application/json", ...(init.headers as Record<string, string> | undefined) },
        redirect: "error",
        signal: AbortSignal.timeout(timeout),
      });
    } catch {
      throw new ErroEvolution("servidor_indisponivel");
    }
    if (resposta.status === 401 || resposta.status === 403) {
      // 403 também é "nome em uso" na criação: quem chama trata antes de chegar aqui.
      throw new ErroEvolution("chave_recusada", resposta.status);
    }
    if (!resposta.ok) throw new ErroEvolution(codigoFalha, resposta.status);
    return resposta;
  }

  async function json(resposta: Response): Promise<unknown> {
    try {
      return await resposta.json();
    } catch {
      throw new ErroEvolution("resposta_invalida");
    }
  }

  return {
    async versao() {
      const corpo = objeto(await json(await chamar("/", {}, "probe_falhou")));
      if (typeof corpo.version !== "string" || !corpo.version.trim()) throw new ErroEvolution("resposta_sem_versao");
      return corpo.version.trim();
    },

    async criarInstancia(nome) {
      const url = `${base}/instance/create`;
      if (opcoes.validar) {
        try {
          await opcoes.validar(base); // a BASE é o que se valida (a URL da chamada leva consulta)
        } catch {
          throw new ErroEvolution("url_recusada");
        }
      }
      let r: Response;
      try {
        r = await opcoes.buscador(url, {
          method: "POST",
          headers: { apikey: opcoes.apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ instanceName: nome, qrcode: false, integration: "WHATSAPP-BAILEYS" }),
          redirect: "error",
          signal: AbortSignal.timeout(timeout),
        });
      } catch {
        throw new ErroEvolution("servidor_indisponivel");
      }
      if (r.ok) return { jaExistia: false };
      // Nome já em uso (nova tentativa após falha parcial): o nome é nosso, segue com a existente.
      const corpo = await r.text().catch(() => "");
      if (r.status === 409 || (r.status === 403 && /already in use/i.test(corpo))) return { jaExistia: true };
      if (r.status === 401 || r.status === 403) throw new ErroEvolution("chave_recusada", r.status);
      throw new ErroEvolution("criar_instancia_falhou", r.status);
    },

    async configurarWebhook(nome, config) {
      const instancia = encodeURIComponent(nome);
      await chamar(`/webhook/set/${instancia}`, {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: config.url,
            headers: config.cabecalhos,
            byEvents: false,
            base64: config.base64,
            events: config.eventos,
          },
        }),
      }, "webhook_falhou");
      const lido = await json(await chamar(`/webhook/find/${instancia}`, {}, "webhook_nao_confirmado"));
      if (!webhookConfere(lido, config)) throw new ErroEvolution("webhook_nao_confirmado");
    },

    async conectar(nome) {
      const corpo = objeto(await json(await chamar(`/instance/connect/${encodeURIComponent(nome)}`, {}, "qr_falhou")));
      const qr = corpo.base64 ?? corpo.code;
      if (typeof qr !== "string" || !qr) throw new ErroEvolution("qr_indisponivel");
      return { qrBase64: qr };
    },

    async estado(nome) {
      const corpo = objeto(await json(await chamar(`/instance/connectionState/${encodeURIComponent(nome)}`, {}, "estado_falhou")));
      const estado = objeto(corpo.instance).state ?? corpo.state;
      if (typeof estado !== "string") throw new ErroEvolution("resposta_invalida");
      return { estado: estado.toLowerCase() };
    },

    async numeroPareado(nome) {
      const corpo = await json(
        await chamar(`/instance/fetchInstances?instanceName=${encodeURIComponent(nome)}`, {}, "estado_falhou"),
      );
      const lista = Array.isArray(corpo) ? corpo : [corpo];
      const itens = lista.map((i) => {
        const o = objeto(i);
        return Object.keys(objeto(o.instance)).length > 0 ? objeto(o.instance) : o;
      });
      const proprio = itens.find((i) => i.name === nome || i.instanceName === nome) ?? (itens.length === 1 ? itens[0] : undefined);
      if (!proprio) return null;
      return digitosDoJid(proprio.ownerJid ?? proprio.owner ?? proprio.number);
    },

    async telefoneDoLid(nome, lid) {
      if (!/^\d{8,20}@lid$/.test(lid)) return null;
      const corpo = objeto(
        await json(
          await chamar(`/chat/findMessages/${encodeURIComponent(nome)}`, {
            method: "POST",
            body: JSON.stringify({ where: { key: { remoteJid: lid } }, limit: 50, page: 1 }),
          }, "historico_falhou"),
        ),
      );
      const registros = objeto(corpo.messages).records ?? corpo.records ?? corpo.messages;
      if (!Array.isArray(registros)) throw new ErroEvolution("resposta_invalida");
      const telefones = new Set<string>();
      for (const registro of registros.slice(0, 50)) {
        const chave = objeto(objeto(registro).key);
        if (chave.remoteJid !== lid || chave.fromMe !== false) continue;
        // Só o par que o próprio WhatsApp registrou na MESMA instância; nunca nome ou foto.
        for (const campo of [chave.remoteJidAlt, chave.senderPn]) {
          const t = typeof campo === "string" && /@s\.whatsapp\.net$/.test(campo) ? digitosDoJid(campo) : null;
          if (t) telefones.add(t);
        }
      }
      return telefones.size === 1 ? [...telefones][0] : null;
    },

    async baixarMidia(nome, origemId, limiteBytes) {
      const maximoBase64 = Math.ceil((limiteBytes * 4) / 3) + 512;
      const r = await chamar(`/chat/getBase64FromMediaMessage/${encodeURIComponent(nome)}`, {
        method: "POST",
        body: JSON.stringify({ message: { key: { id: origemId } }, convertToMp4: false }),
      }, "midia_falhou");
      const declarado = Number(r.headers.get("content-length") ?? 0);
      if (declarado > maximoBase64 * 2) throw new ErroEvolution("midia_grande");
      const texto = await lerTextoComTeto(r, maximoBase64 * 2);
      let dados: Record<string, unknown>;
      try {
        dados = objeto(JSON.parse(texto));
      } catch {
        throw new ErroEvolution("resposta_invalida");
      }
      if (typeof dados.base64 !== "string" || !dados.base64) throw new ErroEvolution("midia_invalida");
      const base64 = dados.base64.replace(/^data:[^,]+,/, "");
      if (base64.length > maximoBase64) throw new ErroEvolution("midia_grande");
      return {
        base64,
        mime: typeof dados.mimetype === "string" ? dados.mimetype : null,
        nome: typeof dados.fileName === "string" ? dados.fileName : null,
      };
    },

    async enviarTexto(nome, numero, texto) {
      await chamar(`/message/sendText/${encodeURIComponent(nome)}`, {
        method: "POST",
        body: JSON.stringify({ number: numero.replace(/\D/g, ""), text: texto }),
      }, "envio_falhou");
    },

    async apagarInstancia(nome) {
      await chamar(`/instance/delete/${encodeURIComponent(nome)}`, { method: "DELETE" }, "apagar_falhou");
    },
  };
}

export { CABECALHO_DO_WEBHOOK };
