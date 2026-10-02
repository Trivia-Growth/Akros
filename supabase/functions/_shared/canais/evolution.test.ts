import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { enviarEvolution, lerEntradaEvolution, registrarWebhookEvolution } from "./evolution.ts";
import { ErroProvedor } from "./tipos.ts";

function evento(over: Record<string, unknown> = {}, key: Record<string, unknown> = {}) {
  return {
    event: "messages.upsert",
    instance: "akros",
    data: {
      key: { remoteJid: "5511988881001@s.whatsapp.net", fromMe: false, id: "3EB0ABC", ...key },
      pushName: "Maria",
      message: { conversation: "Olá, quero saber do EB-2 NIW" },
      messageType: "conversation",
      messageTimestamp: 1790000000,
      ...over,
    },
  };
}

Deno.test("lê mensagem de texto do evento messages.upsert (v2)", () => {
  const e = lerEntradaEvolution(evento());
  assert(e);
  assertEquals(e.origemId, "3EB0ABC");
  assertEquals(e.contatoExterno, "5511988881001");
  assertEquals(e.nome, "Maria");
  assertEquals(e.texto, "Olá, quero saber do EB-2 NIW");
});

Deno.test("aceita variações do nome do evento e texto estendido", () => {
  assert(lerEntradaEvolution({ ...evento(), event: "MESSAGES_UPSERT" }));
  assert(lerEntradaEvolution({ ...evento(), event: "messages-upsert" }));
  const e = lerEntradaEvolution(evento({ message: { extendedTextMessage: { text: "com link" } } }));
  assertEquals(e?.texto, "com link");
});

Deno.test("ignora grupo, mensagem da própria conta, outro evento, mídia e sem número", () => {
  assertEquals(lerEntradaEvolution(evento({}, { remoteJid: "120363@g.us" })), null);
  assertEquals(lerEntradaEvolution(evento({}, { fromMe: true })), null);
  assertEquals(lerEntradaEvolution({ ...evento(), event: "connection.update" }), null);
  assertEquals(lerEntradaEvolution(evento({ message: { imageMessage: {} } })), null);
  assertEquals(lerEntradaEvolution(evento({ message: { conversation: "  " } })), null);
  assertEquals(lerEntradaEvolution(evento({}, { remoteJid: "status@broadcast" })), null);
  assertEquals(lerEntradaEvolution(evento({}, { id: undefined })), null);
  assertEquals(lerEntradaEvolution(null), null);
  assertEquals(lerEntradaEvolution("x"), null);
});

Deno.test("endereço @lid usa o número alternativo; sem ele, ignora", () => {
  const comAlt = lerEntradaEvolution(evento({}, { remoteJid: "9988@lid", remoteJidAlt: "5511988881001@s.whatsapp.net" }));
  assertEquals(comAlt?.contatoExterno, "5511988881001");
  assertEquals(lerEntradaEvolution(evento({}, { remoteJid: "9988@lid" })), null);
});

Deno.test("timestamp inválido cai em 'agora', texto longo é truncado", () => {
  const e = lerEntradaEvolution(evento({ messageTimestamp: "lixo", message: { conversation: "x".repeat(9000) } }));
  assert(e);
  assertEquals(e.texto.length, 4000);
  assert(Math.abs(Date.now() - Date.parse(e.ocorridoEm)) < 5000);
});

Deno.test("envio v2: sendText com {number, text} e apikey no cabeçalho", async () => {
  let visto: { url: string; init: RequestInit } | null = null;
  const f = ((url: string, init: RequestInit) => {
    visto = { url, init };
    return Promise.resolve(new Response("{}", { status: 201 }));
  }) as unknown as typeof fetch;
  await enviarEvolution(f, {
    baseUrl: "https://evo.exemplo.com/", apiKey: "K", instancia: "minha instancia", numero: "+55 11 98888-1001", texto: "Oi",
  });
  const v = visto as unknown as { url: string; init: RequestInit };
  assertEquals(v.url, "https://evo.exemplo.com/message/sendText/minha%20instancia");
  assertEquals((v.init.headers as Record<string, string>).apikey, "K");
  assertEquals(JSON.parse(v.init.body as string), { number: "5511988881001", text: "Oi" });
});

Deno.test("registro do webhook v2: corpo {webhook:{...}} com token em cabeçalho", async () => {
  let corpo: Record<string, unknown> = {};
  let url = "";
  const f = ((u: string, init: RequestInit) => {
    url = u;
    corpo = JSON.parse(init.body as string);
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as unknown as typeof fetch;
  await registrarWebhookEvolution(f, {
    baseUrl: "https://evo.exemplo.com", apiKey: "K", instancia: "akros",
    urlWebhook: "https://p.supabase.co/functions/v1/evolution-webhook?conta=abc", token: "TKN",
  });
  assertEquals(url, "https://evo.exemplo.com/webhook/set/akros");
  assertEquals(corpo, {
    webhook: {
      enabled: true,
      url: "https://p.supabase.co/functions/v1/evolution-webhook?conta=abc",
      headers: { "x-akros-webhook": "TKN" },
      events: ["MESSAGES_UPSERT"],
      webhookBase64: false,
    },
  });
});

Deno.test("falha do provedor: só o status, nunca o corpo", async () => {
  const f = (() => Promise.resolve(new Response("segredo-no-corpo", { status: 400 }))) as unknown as typeof fetch;
  const erro = await assertRejects(
    () => enviarEvolution(f, { baseUrl: "https://e.com", apiKey: "K", instancia: "i", numero: "5511988881001", texto: "x" }),
    ErroProvedor,
  );
  assertEquals(erro.status, 400);
  assert(!erro.message.includes("segredo-no-corpo"));
});
