import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { DepsAgente } from "./agente.ts";
import { hmacSha256Hex } from "./canais/hmac.ts";
import { enviarInstagram, enviarWhatsAppOficial, lerEntradasInstagram, lerEntradasWhatsApp } from "./canais/meta.ts";
import type { SegredoEvolution, SegredoMeta } from "./segredos.ts";
import type { RegraAgente } from "./openrouter.ts";
import { criarManipuladorEvolution } from "./webhook-evolution.ts";
import { criarManipuladorMeta } from "./webhook-meta.ts";
import type { ContaCanal, IOWebhook } from "./webhook.ts";

const CONTA_ID = "11111111-1111-4111-8111-111111111111";
const REGRA: RegraAgente = {
  id: "ag", nome_agente: "Ana", funcao: "triagem", alma: "x", saudacao: "o",
  mensagem_handoff: "Encaminho à equipe.", llm: { provedor: "openrouter", modelo: "m" },
};
const SEG_META: SegredoMeta = { accessToken: "TOK", appSecret: "APPSECRET", verifyToken: "VERIFY" };
const SEG_EVO: SegredoEvolution = { apiKey: "EVOKEY", webhookToken: "WHTOKEN" };

interface Espiao {
  consultasBanco: number;
  depsCriadas: number;
  enviados: Array<{ url: string; corpo: unknown; headers: Record<string, string> }>;
  recibos: Array<{ origemId: string; status?: string }>;
  concluidos: string[];
}

function montarIO(a: {
  conta?: ContaCanal | null;
  segredo?: unknown;
  limite?: boolean;
  registrarFalha?: boolean;
  iaFalha?: boolean;
  duplicada?: boolean;
} = {}): { io: IOWebhook; e: Espiao } {
  const e: Espiao = { consultasBanco: 0, depsCriadas: 0, enviados: [], recibos: [], concluidos: [] };
  const conta: ContaCanal | null = a.conta === undefined
    ? { id: CONTA_ID, ativa: true, credenciais_configuradas: true, metadados_publicos: {
        wabaId: "111", phoneNumberId: "222", igAccountId: "17841", baseUrl: "https://evo.exemplo.com", instancia: "akros",
      } }
    : a.conta;
  const buscador = ((url: string, init: RequestInit) => {
    e.enviados.push({ url, corpo: JSON.parse(init.body as string), headers: init.headers as Record<string, string> });
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as unknown as typeof fetch;
  const io: IOWebhook = {
    buscador,
    limite: () => Promise.resolve({ permitido: a.limite ?? true, reiniciaEm: null }),
    carregarConta: () => {
      e.consultasBanco++;
      return Promise.resolve(conta);
    },
    segredo: <T>() => {
      e.consultasBanco++;
      return Promise.resolve((a.segredo ?? null) as T | null);
    },
    criarDeps: ({ enviar }): DepsAgente => {
      e.depsCriadas++;
      return {
        vincularCliente: () => Promise.resolve(null),
        registrar: ({ entrada }) => {
          if (a.registrarFalha) return Promise.reject(new Error("banco"));
          e.recibos.push({ origemId: entrada.origemId });
          return Promise.resolve(a.duplicada ? { processar: false, conversaId: null } : { processar: true, conversaId: "c1" });
        },
        concluir: ({ status }) => {
          e.concluidos.push(status);
          return Promise.resolve();
        },
        agenteDaConta: () => Promise.resolve(REGRA),
        chaveOpenRouter: () => Promise.resolve("sk"),
        historico: () => Promise.resolve([]),
        gerarResposta: () => a.iaFalha ? Promise.reject(new Error("ia")) : Promise.resolve({ texto: "Resposta do agente", custo: null }),
        enviar,
        log: () => {},
      };
    },
  };
  return { io, e };
}

// ───────────────────────── Meta (WhatsApp oficial) ─────────────────────────
const manipuladorWA = (io: IOWebhook) =>
  criarManipuladorMeta({
    provedor: "whatsapp_oficial",
    escopo: (id) => `meta-whatsapp:${id}`,
    usaTelefone: true,
    ler: (p, m) => lerEntradasWhatsApp(p, { wabaId: String(m.wabaId), phoneNumberId: String(m.phoneNumberId) }),
    enviar: (b, { segredo, metadados, para, texto }) =>
      enviarWhatsAppOficial(b, { accessToken: segredo.accessToken, phoneNumberId: String(metadados.phoneNumberId), para, texto }),
  }, io);

const payloadWA = (id = "wamid.1", over: Record<string, unknown> = {}) => ({
  object: "whatsapp_business_account",
  entry: [{ id: "111", changes: [{ field: "messages", value: {
    metadata: { phone_number_id: "222" },
    messages: [{ id, from: "5511988881001", type: "text", text: { body: "Oi" }, timestamp: "1790000000" }],
    ...over,
  } }] }],
});

async function postAssinado(url: string, payload: unknown, segredo = SEG_META.appSecret, extra: HeadersInit = {}) {
  const corpo = new TextEncoder().encode(JSON.stringify(payload));
  const sig = `sha256=${await hmacSha256Hex(segredo, corpo)}`;
  return new Request(url, { method: "POST", body: corpo, headers: { "x-hub-signature-256": sig, ...extra } });
}
const URL_WA = `https://p.supabase.co/functions/v1/meta-whatsapp-webhook?conta=${CONTA_ID}`;

Deno.test("Meta: método diferente de GET/POST é 405; limite estourado é 429 sem tocar no banco", async () => {
  const a = montarIO({ segredo: SEG_META });
  assertEquals((await manipuladorWA(a.io)(new Request(URL_WA, { method: "DELETE" }))).status, 405);
  const b = montarIO({ segredo: SEG_META, limite: false });
  const r = await manipuladorWA(b.io)(new Request(URL_WA));
  assertEquals(r.status, 429);
  assert(r.headers.get("retry-after"));
  assertEquals(b.e.consultasBanco, 0, "rate limit vem antes de qualquer consulta");
});

Deno.test("Meta: conta inválida, inexistente ou sem credenciais completas", async () => {
  const a = montarIO({ segredo: SEG_META });
  assertEquals((await manipuladorWA(a.io)(new Request("https://p/f?conta=nao-uuid"))).status, 404);
  assertEquals(a.e.consultasBanco, 0, "UUID inválido nem chega ao banco");
  assertEquals((await manipuladorWA(montarIO({ conta: null, segredo: SEG_META }).io)(new Request(URL_WA))).status, 404);
  assertEquals((await manipuladorWA(montarIO({ segredo: null }).io)(new Request(URL_WA))).status, 503);
  assertEquals((await manipuladorWA(montarIO({ segredo: { ...SEG_META, appSecret: "" } }).io)(new Request(URL_WA))).status, 503);
});

Deno.test("Meta GET: desafio com token certo é 200 com o challenge; errado é 403", async () => {
  const { io } = montarIO({ segredo: SEG_META });
  const ok = await manipuladorWA(io)(new Request(`${URL_WA}&hub.mode=subscribe&hub.verify_token=VERIFY&hub.challenge=987`));
  assertEquals([ok.status, await ok.text()], [200, "987"]);
  const ruim = await manipuladorWA(io)(new Request(`${URL_WA}&hub.mode=subscribe&hub.verify_token=ERRADO&hub.challenge=987`));
  assertEquals(ruim.status, 403);
});

Deno.test("Meta POST: assinatura inválida ou ausente é 401 e NADA é interpretado nem processado", async () => {
  const { io, e } = montarIO({ segredo: SEG_META });
  const h = manipuladorWA(io);
  assertEquals((await h(await postAssinado(URL_WA, payloadWA(), "segredo-errado"))).status, 401);
  assertEquals((await h(new Request(URL_WA, { method: "POST", body: JSON.stringify(payloadWA()) }))).status, 401);
  // JSON inválido COM assinatura inválida continua 401 (não 400): o corpo nem foi lido como JSON.
  assertEquals((await h(new Request(URL_WA, { method: "POST", body: "{{{", headers: { "x-hub-signature-256": "sha256=00" } }))).status, 401);
  assertEquals([e.depsCriadas, e.recibos.length], [0, 0]);
});

Deno.test("Meta POST: corpo acima do limite é 413; JSON inválido assinado é 400", async () => {
  const { io } = montarIO({ segredo: SEG_META });
  const h = manipuladorWA(io);
  assertEquals((await h(new Request(URL_WA, { method: "POST", body: "x", headers: { "content-length": "999999" } }))).status, 413);
  const corpo = new TextEncoder().encode("{{{");
  const sig = `sha256=${await hmacSha256Hex(SEG_META.appSecret, corpo)}`;
  assertEquals((await h(new Request(URL_WA, { method: "POST", body: corpo, headers: { "x-hub-signature-256": sig } }))).status, 400);
});

Deno.test("Meta POST válido: agente responde pelo mesmo número com o token da conta", async () => {
  const { io, e } = montarIO({ segredo: SEG_META });
  const r = await manipuladorWA(io)(await postAssinado(URL_WA, payloadWA()));
  assertEquals(r.status, 200);
  assertEquals(e.enviados.length, 1);
  assertEquals(e.enviados[0].url, "https://graph.facebook.com/v26.0/222/messages");
  assertEquals(e.enviados[0].headers.Authorization, "Bearer TOK");
  assertEquals((e.enviados[0].corpo as { to: string }).to, "5511988881001");
  assertEquals(e.concluidos, ["respondido"]);
});

Deno.test("Meta POST: outro número ou outra conta de negócio é 200 e não processa", async () => {
  const { io, e } = montarIO({ segredo: SEG_META });
  const h = manipuladorWA(io);
  const outroNumero = payloadWA("w2", { metadata: { phone_number_id: "999" } });
  assertEquals((await h(await postAssinado(URL_WA, outroNumero))).status, 200);
  assertEquals((await h(await postAssinado(URL_WA, { object: "page", entry: [] }))).status, 200);
  assertEquals([e.recibos.length, e.enviados.length], [0, 0]);
});

Deno.test("Meta POST: reentrega não responde de novo; falha da IA ainda é 200 (a Meta não reentrega)", async () => {
  const dup = montarIO({ segredo: SEG_META, duplicada: true });
  assertEquals((await manipuladorWA(dup.io)(await postAssinado(URL_WA, payloadWA()))).status, 200);
  assertEquals(dup.e.enviados.length, 0);
  const falha = montarIO({ segredo: SEG_META, iaFalha: true });
  assertEquals((await manipuladorWA(falha.io)(await postAssinado(URL_WA, payloadWA()))).status, 200);
  assertEquals(falha.e.concluidos, ["falhou"]);
  assertEquals(falha.e.enviados.length, 0);
});

Deno.test("Meta POST: falha ao registrar o recibo é 500 sem detalhe (a Meta reentrega, nada foi gravado)", async () => {
  const { io } = montarIO({ segredo: SEG_META, registrarFalha: true });
  const r = await manipuladorWA(io)(await postAssinado(URL_WA, payloadWA()));
  assertEquals(r.status, 500);
  assertEquals(await r.json(), { ok: false });
});

Deno.test("Meta POST: conta inativa registra e fecha como ignorado, sem enviar", async () => {
  const { io, e } = montarIO({
    segredo: SEG_META,
    conta: { id: CONTA_ID, ativa: false, credenciais_configuradas: true, metadados_publicos: { wabaId: "111", phoneNumberId: "222" } },
  });
  assertEquals((await manipuladorWA(io)(await postAssinado(URL_WA, payloadWA()))).status, 200);
  assertEquals([e.concluidos, e.enviados.length], [["ignorado"], 0]);
});

// ───────────────────────────── Instagram ─────────────────────────────
const manipuladorIG = (io: IOWebhook) =>
  criarManipuladorMeta({
    provedor: "instagram",
    escopo: (id) => `meta-instagram:${id}`,
    usaTelefone: false,
    ler: (p, m) => lerEntradasInstagram(p, { igAccountId: String(m.igAccountId) }),
    enviar: (b, { segredo, para, texto }) => enviarInstagram(b, { accessToken: segredo.accessToken, para, texto }),
  }, io);
const URL_IG = `https://p.supabase.co/functions/v1/meta-instagram-webhook?conta=${CONTA_ID}`;
const payloadIG = (extra: Record<string, unknown> = {}, de = "99887766") => ({
  object: "instagram",
  entry: [{ id: "17841", messaging: [{ sender: { id: de }, timestamp: 1790000000000, message: { mid: "mid.1", text: "Oi", ...extra } }] }],
});

Deno.test("Instagram: direct válido é respondido por /me/messages; eco da própria conta não gera laço", async () => {
  const a = montarIO({ segredo: SEG_META });
  assertEquals((await manipuladorIG(a.io)(await postAssinado(URL_IG, payloadIG()))).status, 200);
  assertEquals(a.e.enviados[0].url, "https://graph.facebook.com/v26.0/me/messages");
  assertEquals(a.e.enviados[0].corpo, { recipient: { id: "99887766" }, message: { text: "Resposta do agente" } });

  const b = montarIO({ segredo: SEG_META });
  assertEquals((await manipuladorIG(b.io)(await postAssinado(URL_IG, payloadIG({ is_echo: true })))).status, 200);
  assertEquals((await manipuladorIG(b.io)(await postAssinado(URL_IG, payloadIG({}, "17841")))).status, 200);
  assertEquals([b.e.recibos.length, b.e.enviados.length], [0, 0]);
});

Deno.test("Instagram: assinatura inválida é 401", async () => {
  const { io, e } = montarIO({ segredo: SEG_META });
  assertEquals((await manipuladorIG(io)(await postAssinado(URL_IG, payloadIG(), "errado"))).status, 401);
  assertEquals(e.recibos.length, 0);
});

// ───────────────────────────── Evolution ─────────────────────────────
const URL_EVO = `https://p.supabase.co/functions/v1/evolution-webhook?conta=${CONTA_ID}`;
const eventoEvo = (key: Record<string, unknown> = {}) => ({
  event: "messages.upsert",
  data: { key: { remoteJid: "5511988881001@s.whatsapp.net", fromMe: false, id: "3EB0", ...key }, pushName: "Maria", message: { conversation: "Oi" }, messageTimestamp: 1790000000 },
});
const reqEvo = (payload: unknown, token: string | null = SEG_EVO.webhookToken) =>
  new Request(URL_EVO, { method: "POST", body: JSON.stringify(payload), headers: token === null ? {} : { "x-akros-webhook": token } });

Deno.test("Evolution: token ausente ou errado é 401 sem processar", async () => {
  const { io, e } = montarIO({ segredo: SEG_EVO });
  const h = criarManipuladorEvolution(io);
  assertEquals((await h(reqEvo(eventoEvo(), null))).status, 401);
  assertEquals((await h(reqEvo(eventoEvo(), "outro"))).status, 401);
  assertEquals([e.depsCriadas, e.recibos.length], [0, 0]);
  const semSegredo = montarIO({ segredo: null });
  assertEquals((await criarManipuladorEvolution(semSegredo.io)(reqEvo(eventoEvo()))).status, 401);
});

Deno.test("Evolution: mensagem válida é respondida no formato v2 com a chave da conta", async () => {
  const { io, e } = montarIO({ segredo: SEG_EVO });
  assertEquals((await criarManipuladorEvolution(io)(reqEvo(eventoEvo()))).status, 200);
  assertEquals(e.enviados[0].url, "https://evo.exemplo.com/message/sendText/akros");
  assertEquals(e.enviados[0].headers.apikey, "EVOKEY");
  assertEquals(e.enviados[0].corpo, { number: "5511988881001", text: "Resposta do agente" });
  assertEquals(e.concluidos, ["respondido"]);
});

Deno.test("Evolution: grupo, mensagem própria e outro evento são 200 sem processar", async () => {
  const { io, e } = montarIO({ segredo: SEG_EVO });
  const h = criarManipuladorEvolution(io);
  assertEquals((await h(reqEvo(eventoEvo({ remoteJid: "1203@g.us" })))).status, 200);
  assertEquals((await h(reqEvo(eventoEvo({ fromMe: true })))).status, 200);
  assertEquals((await h(reqEvo({ event: "connection.update", data: {} }))).status, 200);
  assertEquals(e.recibos.length, 0);
});

Deno.test("Evolution: conta inexistente é 404; limite é 429; método errado é 405; JSON inválido autenticado é 400", async () => {
  assertEquals((await criarManipuladorEvolution(montarIO({ conta: null, segredo: SEG_EVO }).io)(reqEvo(eventoEvo()))).status, 404);
  assertEquals((await criarManipuladorEvolution(montarIO({ segredo: SEG_EVO, limite: false }).io)(reqEvo(eventoEvo()))).status, 429);
  assertEquals((await criarManipuladorEvolution(montarIO({ segredo: SEG_EVO }).io)(new Request(URL_EVO))).status, 405);
  const ruim = new Request(URL_EVO, { method: "POST", body: "{{{", headers: { "x-akros-webhook": SEG_EVO.webhookToken } });
  assertEquals((await criarManipuladorEvolution(montarIO({ segredo: SEG_EVO }).io)(ruim)).status, 400);
});

Deno.test("Evolution: conta sem URL/instância não envia e fecha como ignorado", async () => {
  const { io, e } = montarIO({
    segredo: SEG_EVO,
    conta: { id: CONTA_ID, ativa: true, credenciais_configuradas: true, metadados_publicos: {} },
  });
  assertEquals((await criarManipuladorEvolution(io)(reqEvo(eventoEvo()))).status, 200);
  assertEquals([e.concluidos, e.enviados.length], [["ignorado"], 0]);
});
