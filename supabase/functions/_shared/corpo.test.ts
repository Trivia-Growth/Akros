// AV-07 (revisão adversarial, 2026-10-28): o teto de corpo precisa valer sem `content-length`.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { lerCorpoComLimite, lerTextoComLimite } from "./corpo.ts";
import { lerCorpoLimitado, LIMITE_CORPO } from "./webhook.ts";

/** Pedido com corpo em stream (sem content-length) que conta quantos blocos foram puxados. */
function chunked(blocos: number, tamanho: number) {
  const estado = { puxados: 0 };
  const bloco = new Uint8Array(tamanho).fill(65);
  const corpo = new ReadableStream<Uint8Array>({
    pull(c) {
      if (estado.puxados >= blocos) return c.close();
      estado.puxados++;
      c.enqueue(bloco);
    },
  }, { highWaterMark: 0 });
  const req = new Request("https://x/hook", { method: "POST", body: corpo, duplex: "half" } as RequestInit);
  return { req, estado };
}

Deno.test("AV-07: chunked de 20 MiB é cortado no primeiro bloco acima do teto, não lido inteiro", async () => {
  const { req, estado } = chunked(20, 1024 * 1024);
  assertEquals(req.headers.get("content-length"), null);
  assert((await lerCorpoComLimite(req, 64 * 1024)) === null, "corpo acima do teto precisa ser recusado");
  assert(estado.puxados <= 2, `puxou ${estado.puxados} MiB de um teto de 64 KiB`);
});

Deno.test("AV-07: o helper dos webhooks (LIMITE_CORPO) também corta o chunked", async () => {
  const { req, estado } = chunked(20, 1024 * 1024);
  assert((await lerCorpoLimitado(req)) === null, "corpo acima do teto precisa ser recusado");
  assert(estado.puxados <= 2, `puxou ${estado.puxados} MiB`);
});

Deno.test("AV-07: muitos blocos pequenos também param no teto", async () => {
  const { req, estado } = chunked(100_000, 1024);
  assert((await lerCorpoComLimite(req, 8 * 1024)) === null, "corpo acima do teto precisa ser recusado");
  assert(estado.puxados <= 10, `puxou ${estado.puxados} blocos de 1 KiB para um teto de 8 KiB`);
});

Deno.test("corpo exatamente no teto passa; um byte a mais não", async () => {
  const no = new Request("https://x/", { method: "POST", body: new Uint8Array(1000) });
  assertEquals((await lerCorpoComLimite(no, 1000))?.byteLength, 1000);
  const acima = new Request("https://x/", { method: "POST", body: new Uint8Array(1001) });
  assert((await lerCorpoComLimite(acima, 1000)) === null, "1 byte acima do teto");
});

Deno.test("content-length acima do teto recusa sem ler o stream", async () => {
  let puxou = false;
  const corpo = new ReadableStream<Uint8Array>({ pull(c) { puxou = true; c.close(); } }, { highWaterMark: 0 });
  const req = new Request("https://x/", {
    method: "POST",
    body: corpo,
    duplex: "half",
    headers: { "content-length": "999999" },
  } as RequestInit);
  assertEquals(await lerCorpoComLimite(req, 1000), null);
  assertEquals(puxou, false);
});

Deno.test("content-length inválido recusa", async () => {
  const req = new Request("https://x/", { method: "POST", body: "ok", headers: { "content-length": "abc" } });
  assertEquals(await lerCorpoComLimite(req, 1000), null);
});

Deno.test("sem corpo devolve vazio; blocos são concatenados na ordem", async () => {
  assertEquals((await lerCorpoComLimite(new Request("https://x/", { method: "POST" }), 10))?.byteLength, 0);
  const partes = ["abc", "def", "ghi"];
  let i = 0;
  const enc = new TextEncoder();
  const corpo = new ReadableStream<Uint8Array>({
    pull(c) {
      if (i >= partes.length) return c.close();
      c.enqueue(enc.encode(partes[i++]));
    },
  }, { highWaterMark: 0 });
  const req = new Request("https://x/", { method: "POST", body: corpo, duplex: "half" } as RequestInit);
  assertEquals(await lerTextoComLimite(req, 100), "abcdefghi");
});

Deno.test("texto UTF-8 é decodificado e o teto conta BYTES, não caracteres", async () => {
  const req = () => new Request("https://x/", { method: "POST", body: "ação" }); // 6 bytes, 4 caracteres
  assertEquals(await lerTextoComLimite(req(), 6), "ação");
  assertEquals(await lerTextoComLimite(req(), 5), null);
});

Deno.test("LIMITE_CORPO dos webhooks continua 64 KiB", () => {
  assertEquals(LIMITE_CORPO, 64 * 1024);
});
