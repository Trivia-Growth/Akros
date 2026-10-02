import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { EntradaSchema, urlWebhook } from "./integracoes-schema.ts";

const AGENTE = {
  nome: "Ana", funcao: "triagem", alma: "Acolha o cliente e encaminhe casos jurídicos.",
  saudacao: "Olá!", mensagemHandoff: "Vou encaminhar.", modelo: "openai/gpt-4.1-mini", ativo: false,
};
const evo = { provedor: "evolution", nomeExibicao: "WhatsApp Akros", identificador: "5511999999999", baseUrl: "https://evo.exemplo.com", instancia: "akros", apiKey: "chave-evolution", ativa: true };
const wa = { provedor: "whatsapp_oficial", nomeExibicao: "WhatsApp oficial", identificador: "+55 11 99999-9999", phoneNumberId: "123456789012345", wabaId: "987654321098765", accessToken: "EAAB-token-longo", appSecret: "app-secret-1", verifyToken: "meu-token-verificacao", ativa: true };
const ig = { provedor: "instagram", nomeExibicao: "Instagram Akros", identificador: "akros.immigration", igAccountId: "17841400000000001", accessToken: "EAAB-token-longo", appSecret: "app-secret-1", verifyToken: "meu-token-verificacao", ativa: false };

const ok = (canal: unknown, agente: unknown = AGENTE) => EntradaSchema.safeParse({ canal, agente });

Deno.test("aceita os três provedores", () => {
  for (const canal of [evo, wa, ig]) assert(ok(canal).success, JSON.stringify(canal));
});

Deno.test("chaves são opcionais (editar sem trocar chave) e o schema não as exige", () => {
  const { apiKey: _a, ...semChave } = evo;
  assert(ok(semChave).success);
  const { accessToken: _t, appSecret: _s, verifyToken: _v, ...semMeta } = wa;
  assert(ok(semMeta).success);
});

Deno.test("recusa campo desconhecido (strict), provedor desconhecido e mistura de campos de outro provedor", () => {
  assert(!ok({ ...evo, extra: 1 }).success);
  assert(!ok({ ...evo, provedor: "telegram" }).success);
  assert(!ok({ ...evo, wabaId: "123456" }).success, "campo de Meta em canal Evolution");
  assert(!ok({ ...wa, baseUrl: "https://x.com" }).success, "campo de Evolution em canal Meta");
  assert(!EntradaSchema.safeParse({ canal: evo, agente: AGENTE, extra: 1 }).success);
  assert(!EntradaSchema.safeParse({ evolution: evo, agente: AGENTE }).success, "formato antigo (E13-S12) não vale mais");
});

Deno.test("Evolution: só HTTPS e instância sem caracteres perigosos", () => {
  assert(!ok({ ...evo, baseUrl: "http://evo.exemplo.com" }).success);
  assert(!ok({ ...evo, baseUrl: "javascript:alert(1)" }).success);
  assert(!ok({ ...evo, instancia: "../etc/passwd" }).success);
  assert(!ok({ ...evo, instancia: "a b" }).success);
});

Deno.test("Meta: ids só com dígitos; token de verificação seguro para query string", () => {
  assert(!ok({ ...wa, phoneNumberId: "abc" }).success);
  assert(!ok({ ...wa, wabaId: "12 34" }).success);
  assert(!ok({ ...ig, igAccountId: "1; DROP" }).success);
  assert(!ok({ ...wa, verifyToken: "curto" }).success);
  assert(!ok({ ...wa, verifyToken: "tem espaço e & ?" }).success);
});

Deno.test("segredos curtos demais são recusados", () => {
  assert(!ok({ ...evo, apiKey: "1234567" }).success);
  assert(!ok({ ...wa, accessToken: "curto" }).success);
  assert(!ok(evo, { ...AGENTE, apiKeyOpenRouter: "curto" }).success);
});

Deno.test("agente: orientação mínima e tamanhos máximos", () => {
  assert(!ok(evo, { ...AGENTE, alma: "curta" }).success);
  assert(!ok(evo, { ...AGENTE, alma: "x".repeat(6001) }).success);
  assert(!ok(evo, { ...AGENTE, agenteId: "nao-uuid" }).success);
});

Deno.test("URL do webhook por provedor", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assertEquals(urlWebhook("https://p.supabase.co/", "evolution", id), `https://p.supabase.co/functions/v1/evolution-webhook?conta=${id}`);
  assertEquals(urlWebhook("https://p.supabase.co", "whatsapp_oficial", id), `https://p.supabase.co/functions/v1/meta-whatsapp-webhook?conta=${id}`);
  assertEquals(urlWebhook("https://p.supabase.co", "instagram", id), `https://p.supabase.co/functions/v1/meta-instagram-webhook?conta=${id}`);
});
