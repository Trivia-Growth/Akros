import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type ConfigWebhook, criarClienteEvolution, ErroEvolution, webhookConfere } from "./evolution-cliente.ts";

interface Chamada {
  url: string;
  metodo: string;
  headers: Record<string, string>;
  corpo: unknown;
}

function falso(respostas: Array<Response | Error | ((c: Chamada) => Response)>) {
  const chamadas: Chamada[] = [];
  let i = 0;
  const buscador = ((url: string, init: RequestInit = {}) => {
    const c: Chamada = {
      url,
      metodo: init.method ?? "GET",
      headers: init.headers as Record<string, string>,
      corpo: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    };
    chamadas.push(c);
    assertEquals(init.redirect, "error", "redirect precisa falhar");
    assert(init.signal, "toda chamada precisa de timeout");
    const r = respostas[Math.min(i++, respostas.length - 1)];
    if (r instanceof Error) return Promise.reject(r);
    return Promise.resolve(typeof r === "function" ? r(c) : r.clone());
  }) as unknown as typeof fetch;
  return { buscador, chamadas };
}

const ok = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });
const CONFIG: ConfigWebhook = {
  url: "https://p.supabase.co/functions/v1/evolution-webhook?conta=abc",
  cabecalhos: { "x-akros-webhook": "SEGREDO" },
  eventos: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
  base64: false,
};
const webhookLido = (over: Record<string, unknown> = {}) => ({
  enabled: true,
  url: CONFIG.url,
  headers: { "x-akros-webhook": "SEGREDO" },
  events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
  webhookBase64: false,
  ...over,
});

const cliente = (buscador: typeof fetch, extra = {}) =>
  criarClienteEvolution({ buscador, baseUrl: "https://evo.exemplo.com/", apiKey: "CHAVE", ...extra });

Deno.test("versão: GET / com apikey; sem versão é erro", async () => {
  const f = falso([ok({ status: 200, version: "2.3.7" })]);
  assertEquals(await cliente(f.buscador).versao(), "2.3.7");
  assertEquals([f.chamadas[0].url, f.chamadas[0].headers.apikey], ["https://evo.exemplo.com/", "CHAVE"]);
  await assertRejects(() => cliente(falso([ok({})]).buscador).versao(), ErroEvolution, "resposta_sem_versao");
});

Deno.test("chave recusada (401) e servidor fora do ar viram códigos, sem corpo", async () => {
  const e1 = await assertRejects(() => cliente(falso([new Response("segredo no corpo", { status: 401 })]).buscador).versao(), ErroEvolution);
  assertEquals([e1.codigo, e1.status], ["chave_recusada", 401]);
  assert(!e1.message.includes("segredo"));
  const e2 = await assertRejects(() => cliente(falso([new TypeError("rede")]).buscador).versao(), ErroEvolution);
  assertEquals(e2.codigo, "servidor_indisponivel");
});

Deno.test("URL recusada pelo validador não chega à rede", async () => {
  const f = falso([ok({ version: "x" })]);
  const c = cliente(f.buscador, { validar: () => Promise.reject(new Error("privada")) });
  const e = await assertRejects(() => c.versao(), ErroEvolution);
  assertEquals(e.codigo, "url_recusada");
  assertEquals(f.chamadas.length, 0);
});

Deno.test("criar instância: corpo v2; 'already in use' (403) e 409 são idempotentes", async () => {
  const f = falso([ok({ instance: {} }, 201)]);
  assertEquals(await cliente(f.buscador).criarInstancia("akros-1"), { jaExistia: false });
  assertEquals(f.chamadas[0].corpo, { instanceName: "akros-1", qrcode: false, integration: "WHATSAPP-BAILEYS" });
  const uso = new Response(JSON.stringify({ response: { message: ["This name \"akros-1\" is already in use."] } }), { status: 403 });
  assertEquals(await cliente(falso([uso]).buscador).criarInstancia("akros-1"), { jaExistia: true });
  assertEquals(await cliente(falso([new Response("{}", { status: 409 })]).buscador).criarInstancia("akros-1"), { jaExistia: true });
  const recusada = await assertRejects(() => cliente(falso([new Response("{}", { status: 403 })]).buscador).criarInstancia("x"), ErroEvolution);
  assertEquals(recusada.codigo, "chave_recusada");
  const falhou = await assertRejects(() => cliente(falso([new Response("{}", { status: 500 })]).buscador).criarInstancia("x"), ErroEvolution);
  assertEquals(falhou.codigo, "criar_instancia_falhou");
});

Deno.test("webhook: grava com base64 (não webhookBase64) e RELÊ antes de dar sucesso", async () => {
  const f = falso([ok({}, 201), ok(webhookLido())]);
  await cliente(f.buscador).configurarWebhook("akros-1", CONFIG);
  assertEquals(f.chamadas.map((c) => `${c.metodo} ${c.url}`), [
    "POST https://evo.exemplo.com/webhook/set/akros-1",
    "GET https://evo.exemplo.com/webhook/find/akros-1",
  ]);
  assertEquals(f.chamadas[0].corpo, {
    webhook: {
      enabled: true,
      url: CONFIG.url,
      headers: { "x-akros-webhook": "SEGREDO" },
      byEvents: false,
      base64: false,
      events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
    },
  });
});

Deno.test("webhook: 2xx no set mas leitura não confere ⇒ NÃO confirmado", async () => {
  for (
    const lido of [
      webhookLido({ enabled: false }),
      webhookLido({ url: "https://outro/x" }),
      webhookLido({ headers: {} }),
      webhookLido({ headers: { "x-akros-webhook": "OUTRO" } }),
      webhookLido({ events: ["MESSAGES_UPSERT"] }),
      webhookLido({ webhookBase64: true }),
      "lixo",
      null,
    ]
  ) {
    const f = falso([ok({}, 201), ok(lido)]);
    const e = await assertRejects(() => cliente(f.buscador).configurarWebhook("akros-1", CONFIG), ErroEvolution);
    assertEquals(e.codigo, "webhook_nao_confirmado");
  }
});

Deno.test("webhook: aceita leitura plana ou embrulhada em `webhook`, com `base64` ou `webhookBase64`", () => {
  assert(webhookConfere(webhookLido(), CONFIG));
  assert(webhookConfere({ webhook: webhookLido() }, CONFIG));
  const { webhookBase64: _x, ...semFlag } = webhookLido();
  assert(webhookConfere({ ...semFlag, base64: false }, CONFIG), "versão que devolve `base64`");
  assert(webhookConfere(semFlag, CONFIG), "versão que não devolve a flag");
  assert(webhookConfere(webhookLido({ events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "SEND_MESSAGE"] }), CONFIG), "evento extra é tolerado");
  assert(!webhookConfere(webhookLido(), { ...CONFIG, base64: true }), "pedir base64 nunca é aceitável");
});

Deno.test("falha ao gravar o webhook (5xx) é webhook_falhou e não lê nada", async () => {
  const f = falso([new Response("{}", { status: 500 })]);
  const e = await assertRejects(() => cliente(f.buscador).configurarWebhook("akros-1", CONFIG), ErroEvolution);
  assertEquals(e.codigo, "webhook_falhou");
  assertEquals(f.chamadas.length, 1);
});

Deno.test("QR: aceita `base64` ou `code`; sem QR é erro", async () => {
  assertEquals((await cliente(falso([ok({ base64: "data:image/png;base64,AAA" })]).buscador).conectar("n")).qrBase64, "data:image/png;base64,AAA");
  assertEquals((await cliente(falso([ok({ code: "2@abc" })]).buscador).conectar("n")).qrBase64, "2@abc");
  const e = await assertRejects(() => cliente(falso([ok({ count: 0 })]).buscador).conectar("n"), ErroEvolution);
  assertEquals(e.codigo, "qr_indisponivel");
});

Deno.test("estado: lê `instance.state` ou `state`", async () => {
  assertEquals(await cliente(falso([ok({ instance: { instanceName: "n", state: "open" } })]).buscador).estado("n"), { estado: "open" });
  assertEquals(await cliente(falso([ok({ state: "CLOSE" })]).buscador).estado("n"), { estado: "close" });
});

Deno.test("número pareado: ownerJid de fetchInstances (formatos plano e embrulhado), sem sufixo de dispositivo", async () => {
  const plano = [{ name: "n", ownerJid: "5511988881001:7@s.whatsapp.net" }];
  assertEquals(await cliente(falso([ok(plano)]).buscador).numeroPareado("n"), "5511988881001");
  const embrulhado = [{ instance: { instanceName: "n", owner: "5511988881001@s.whatsapp.net" } }];
  assertEquals(await cliente(falso([ok(embrulhado)]).buscador).numeroPareado("n"), "5511988881001");
  assertEquals(await cliente(falso([ok([{ name: "outra", ownerJid: "5511999990000@s.whatsapp.net" }, { name: "n" }])]).buscador).numeroPareado("n"), null);
  assertEquals(await cliente(falso([ok([])]).buscador).numeroPareado("n"), null);
});

Deno.test("LID: telefone só se EXATAMENTE um par comprovado existir no histórico da instância", async () => {
  const lid = "9988776655@lid";
  const reg = (extra: Record<string, unknown>) => ({ key: { remoteJid: lid, fromMe: false, ...extra } });
  const um = ok({ messages: { records: [reg({ remoteJidAlt: "5511988881001@s.whatsapp.net" }), reg({ senderPn: "5511988881001@s.whatsapp.net" })] } });
  const f = falso([um]);
  assertEquals(await cliente(f.buscador).telefoneDoLid("n", lid), "5511988881001");
  assertEquals(f.chamadas[0].corpo, { where: { key: { remoteJid: lid } }, limit: 50, page: 1 });
  const dois = ok({ messages: { records: [reg({ remoteJidAlt: "5511988881001@s.whatsapp.net" }), reg({ remoteJidAlt: "5511977770000@s.whatsapp.net" })] } });
  assertEquals(await cliente(falso([dois]).buscador).telefoneDoLid("n", lid), null);
  const nenhum = ok({ messages: { records: [reg({})] } });
  assertEquals(await cliente(falso([nenhum]).buscador).telefoneDoLid("n", lid), null);
  const proprias = ok({ messages: { records: [{ key: { remoteJid: lid, fromMe: true, remoteJidAlt: "5511988881001@s.whatsapp.net" } }] } });
  assertEquals(await cliente(falso([proprias]).buscador).telefoneDoLid("n", lid), null, "mensagem enviada por nós não prova o remetente");
  assertEquals(await cliente(falso([ok({})]).buscador).telefoneDoLid("n", "5511@s.whatsapp.net"), null, "só LID é consultado");
});

Deno.test("mídia: pede por key.id, remove prefixo data:, respeita o limite", async () => {
  const f = falso([ok({ base64: "data:application/pdf;base64,QUJD", mimetype: "application/pdf", fileName: "a.pdf" })]);
  const m = await cliente(f.buscador).baixarMidia("n", "3EB0", 1024);
  assertEquals(m, { base64: "QUJD", mime: "application/pdf", nome: "a.pdf" });
  assertEquals(f.chamadas[0].corpo, { message: { key: { id: "3EB0" } }, convertToMp4: false });
  const grande = ok({ base64: "A".repeat(5000) });
  const e = await assertRejects(() => cliente(falso([grande]).buscador).baixarMidia("n", "3EB0", 1024), ErroEvolution);
  assertEquals(e.codigo, "midia_grande");
  const vazia = await assertRejects(() => cliente(falso([ok({})]).buscador).baixarMidia("n", "3EB0", 1024), ErroEvolution);
  assertEquals(vazia.codigo, "midia_invalida");
});

Deno.test("envio v2: sendText com {number, text} só dígitos e apikey; 500 vira envio_falhou", async () => {
  const f = falso([ok({ key: { id: "X" } }, 201)]);
  await cliente(f.buscador).enviarTexto("minha instancia", "+55 11 98888-1001", "Oi");
  assertEquals(f.chamadas[0].url, "https://evo.exemplo.com/message/sendText/minha%20instancia");
  assertEquals(f.chamadas[0].corpo, { number: "5511988881001", text: "Oi" });
  const e = await assertRejects(() => cliente(falso([new Response("Connection Closed", { status: 500 })]).buscador).enviarTexto("n", "5511988881001", "x"), ErroEvolution);
  assertEquals([e.codigo, e.status], ["envio_falhou", 500]);
  assert(!e.message.includes("Connection"));
});

Deno.test("apagar instância usa DELETE /instance/delete/{nome}", async () => {
  const f = falso([ok({})]);
  await cliente(f.buscador).apagarInstancia("smoke-1");
  assertEquals([f.chamadas[0].metodo, f.chamadas[0].url], ["DELETE", "https://evo.exemplo.com/instance/delete/smoke-1"]);
});

Deno.test("mídia: corpo SEM Content-Length acima do teto é abandonado no meio (memória protegida)", async () => {
  let lidos = 0;
  const corpo = new ReadableStream<Uint8Array>({
    pull(controlador) {
      lidos++;
      controlador.enqueue(new TextEncoder().encode("A".repeat(1024)));
      if (lidos > 10_000) controlador.close();
    },
  });
  // (sem o helper `falso`: clonar uma Response de fluxo infinito bloquearia o teste)
  const buscador = (() => Promise.resolve(new Response(corpo, { status: 200 }))) as unknown as typeof fetch;
  const e = await assertRejects(() => cliente(buscador).baixarMidia("n", "3EB0", 1024), ErroEvolution);
  assertEquals(e.codigo, "midia_grande");
  assert(lidos < 50, `deveria parar cedo, mas leu ${lidos} pedaços`);
});
