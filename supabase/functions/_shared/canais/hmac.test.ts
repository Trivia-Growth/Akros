import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assinaturaMetaValida, hmacSha256Hex } from "./hmac.ts";

const corpo = new TextEncoder().encode('{"object":"whatsapp_business_account"}');

Deno.test("hmacSha256Hex bate com vetor conhecido (RFC 4231, caso 2)", async () => {
  const r = await hmacSha256Hex("Jefe", new TextEncoder().encode("what do ya want for nothing?"));
  assertEquals(r, "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843");
});

Deno.test("aceita assinatura correta", async () => {
  const sig = `sha256=${await hmacSha256Hex("segredo", corpo)}`;
  assert(await assinaturaMetaValida("segredo", corpo, sig));
});

Deno.test("recusa segredo errado, corpo alterado, cabeçalho ausente ou malformado", async () => {
  const sig = `sha256=${await hmacSha256Hex("segredo", corpo)}`;
  assert(!(await assinaturaMetaValida("outro", corpo, sig)));
  assert(!(await assinaturaMetaValida("segredo", new TextEncoder().encode("{}"), sig)));
  assert(!(await assinaturaMetaValida("segredo", corpo, null)));
  assert(!(await assinaturaMetaValida("segredo", corpo, "")));
  assert(!(await assinaturaMetaValida("segredo", corpo, sig.replace("sha256=", "sha1="))));
  assert(!(await assinaturaMetaValida("segredo", corpo, sig.slice(0, -2))));
});

Deno.test("segredo vazio nunca valida (conta sem App Secret configurado)", async () => {
  // Qualquer assinatura é recusada se o App Secret da conta não foi configurado (não chega a HMAC).
  const sig = `sha256=${await hmacSha256Hex("outro", corpo)}`;
  assert(!(await assinaturaMetaValida("", corpo, sig)));
  assert(!(await assinaturaMetaValida("", corpo, "sha256=")));
});
