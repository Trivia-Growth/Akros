import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  enviarInstagram,
  enviarWhatsAppOficial,
  lerEntradasInstagram,
  lerEntradasWhatsApp,
  META_GRAPH_BASE,
  responderDesafio,
} from "./meta.ts";
import { ErroProvedor } from "./tipos.ts";

const CONTA = { wabaId: "111", phoneNumberId: "222" };

function whatsapp(mensagens: unknown[], over: Record<string, unknown> = {}) {
  return {
    object: "whatsapp_business_account",
    entry: [{
      id: "111",
      changes: [{
        field: "messages",
        value: {
          metadata: { phone_number_id: "222" },
          contacts: [{ wa_id: "5511988881001", profile: { name: "Maria" } }],
          messages: mensagens,
          ...over,
        },
      }],
    }],
  };
}
const texto = (id: string, de = "5511988881001", body = "Oi") => ({
  id, from: de, type: "text", timestamp: "1790000000", text: { body },
});

Deno.test("desafio: token certo devolve o challenge em texto puro", async () => {
  const r = responderDesafio(
    new URL("https://x/f?hub.mode=subscribe&hub.verify_token=abc&hub.challenge=1234"),
    "abc",
  );
  assertEquals(r.status, 200);
  assertEquals(await r.text(), "1234");
});

Deno.test("desafio: token errado, modo errado, sem challenge ou token esperado vazio são 403", () => {
  const u = (q: string) => new URL(`https://x/f?${q}`);
  assertEquals(responderDesafio(u("hub.mode=subscribe&hub.verify_token=zzz&hub.challenge=1"), "abc").status, 403);
  assertEquals(responderDesafio(u("hub.mode=unsubscribe&hub.verify_token=abc&hub.challenge=1"), "abc").status, 403);
  assertEquals(responderDesafio(u("hub.mode=subscribe&hub.verify_token=abc"), "abc").status, 403);
  assertEquals(responderDesafio(u("hub.mode=subscribe&hub.verify_token=&hub.challenge=1"), "").status, 403);
  assertEquals(
    responderDesafio(u(`hub.mode=subscribe&hub.verify_token=abc&hub.challenge=${"9".repeat(5000)}`), "abc").status,
    403,
  );
});

Deno.test("WhatsApp: lê texto, nome do contato e horário", () => {
  const r = lerEntradasWhatsApp(whatsapp([texto("wamid.1")]), CONTA);
  assertEquals(r.length, 1);
  assertEquals(r[0].origemId, "wamid.1");
  assertEquals(r[0].contatoExterno, "5511988881001");
  assertEquals(r[0].nome, "Maria");
  assertEquals(r[0].ocorridoEm, new Date(1790000000 * 1000).toISOString());
});

Deno.test("WhatsApp: ignora outra conta de negócio, outro número, status, mídia e texto vazio", () => {
  assertEquals(lerEntradasWhatsApp(whatsapp([texto("a")]), { ...CONTA, wabaId: "999" }), []);
  assertEquals(lerEntradasWhatsApp(whatsapp([texto("a")]), { ...CONTA, phoneNumberId: "999" }), []);
  assertEquals(lerEntradasWhatsApp(whatsapp([], { statuses: [{ id: "x", status: "read" }] }), CONTA), []);
  assertEquals(lerEntradasWhatsApp(whatsapp([{ id: "m", from: "5511", type: "image" }]), CONTA), []);
  assertEquals(lerEntradasWhatsApp(whatsapp([texto("b", "5511988881001", "   ")]), CONTA), []);
  assertEquals(lerEntradasWhatsApp(whatsapp([texto("c", "abc")]), CONTA), []);
  assertEquals(lerEntradasWhatsApp({ object: "page", entry: [] }, CONTA), []);
  assertEquals(lerEntradasWhatsApp(null, CONTA), []);
  assertEquals(lerEntradasWhatsApp("lixo", CONTA), []);
});

Deno.test("WhatsApp: várias mensagens no mesmo envio, texto longo é truncado", () => {
  const r = lerEntradasWhatsApp(
    whatsapp([texto("1"), texto("2", "5511977770000", "x".repeat(9000))]),
    CONTA,
  );
  assertEquals(r.map((e) => e.origemId), ["1", "2"]);
  assertEquals(r[1].texto.length, 4000);
});

function instagram(messaging: unknown[], id = "17841") {
  return { object: "instagram", entry: [{ id, messaging }] };
}
const direct = (mid: string, de = "99887766", text = "Oi", extra: Record<string, unknown> = {}) => ({
  sender: { id: de }, recipient: { id: "17841" }, timestamp: 1790000000000, message: { mid, text, ...extra },
});

Deno.test("Instagram: lê direct de texto", () => {
  const r = lerEntradasInstagram(instagram([direct("m.1")]), { igAccountId: "17841" });
  assertEquals(r.length, 1);
  assertEquals(r[0].contatoExterno, "99887766");
  assertEquals(r[0].origemId, "m.1");
});

Deno.test("Instagram: ignora eco, a própria conta, outra conta, sem texto e sem mid", () => {
  const conta = { igAccountId: "17841" };
  assertEquals(lerEntradasInstagram(instagram([direct("e", "99887766", "Oi", { is_echo: true })]), conta), []);
  assertEquals(lerEntradasInstagram(instagram([direct("s", "17841")]), conta), []);
  assertEquals(lerEntradasInstagram(instagram([direct("a")], "outra"), conta), []);
  assertEquals(lerEntradasInstagram(instagram([direct("t", "99887766", "")]), conta), []);
  assertEquals(
    lerEntradasInstagram(instagram([{ sender: { id: "99887766" }, message: { text: "oi" } }]), conta),
    [],
  );
  assertEquals(lerEntradasInstagram({ object: "whatsapp_business_account", entry: [] }, conta), []);
});

Deno.test("envio WhatsApp: URL, cabeçalho e corpo da Cloud API", async () => {
  let visto: { url: string; init: RequestInit } | null = null;
  const f = ((url: string, init: RequestInit) => {
    visto = { url, init };
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as unknown as typeof fetch;
  await enviarWhatsAppOficial(f, { accessToken: "TOK", phoneNumberId: "222", para: "+55 11 98888-1001", texto: "Olá" });
  assert(visto);
  const v = visto as { url: string; init: RequestInit };
  assertEquals(v.url, `${META_GRAPH_BASE}/222/messages`);
  assertEquals((v.init.headers as Record<string, string>).Authorization, "Bearer TOK");
  assertEquals(JSON.parse(v.init.body as string), {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: "5511988881001",
    type: "text",
    text: { preview_url: false, body: "Olá" },
  });
});

Deno.test("envio Instagram: /me/messages com recipient e message", async () => {
  let corpo = "";
  let url = "";
  const f = ((u: string, init: RequestInit) => {
    url = u;
    corpo = init.body as string;
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as unknown as typeof fetch;
  await enviarInstagram(f, { accessToken: "TOK", para: "99887766", texto: "Olá" });
  assertEquals(url, `${META_GRAPH_BASE}/me/messages`);
  assertEquals(JSON.parse(corpo), { recipient: { id: "99887766" }, message: { text: "Olá" } });
});

Deno.test("envio: erro do provedor vira ErroProvedor só com o status, sem o corpo", async () => {
  const f = (() => Promise.resolve(new Response('{"error":{"message":"token 5511988881001"}}', { status: 401 }))) as unknown as typeof fetch;
  const erro = await assertRejects(
    () => enviarInstagram(f, { accessToken: "T", para: "99887766", texto: "x" }),
    ErroProvedor,
  );
  assertEquals(erro.status, 401);
  assert(!erro.message.includes("5511988881001"), "corpo do provedor não pode vazar para a mensagem");
});
