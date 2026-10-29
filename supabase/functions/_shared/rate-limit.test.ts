// AV-04 (revisão adversarial, 2026-10-28): a chave do limite nunca pode vir de dado que o cliente
// controla. `x-forwarded-for` chega como "<o que o cliente mandou>, <IP que o proxy viu>": o
// PRIMEIRO elemento é forjável, o último é o do proxy mais próximo.
// AV-05: a cota por contato usa a mesma chave hasheada, por identidade em vez de origem de rede.
// Sem permissão de ambiente de propósito (ver `test:functions`): a regra é pura e recebe a config.
import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type ConfigOrigem, chaveHash, lerConfigOrigem, origemDoPedido } from "./rate-limit.ts";

const PADRAO: ConfigOrigem = { proxiesConfiaveis: 1, cabecalhoIp: null };
const origem = (xff: string | null, cfg: ConfigOrigem = PADRAO, extra: Record<string, string> = {}) =>
  origemDoPedido(new Headers({ ...(xff === null ? {} : { "x-forwarded-for": xff }), ...extra }), cfg);

Deno.test("AV-04: primeiro elemento de x-forwarded-for forjado NÃO muda a origem", () => {
  // O mesmo atacante (203.0.113.9, anexado pelo proxy) com um "primeiro IP" diferente a cada pedido.
  const origens = [
    origem("1.1.1.1, 203.0.113.9"),
    origem("2.2.2.2, 203.0.113.9"),
    origem("3.3.3.3, 4.4.4.4, 203.0.113.9"),
  ];
  assertEquals(new Set(origens), new Set(["203.0.113.9"]));
});

Deno.test("AV-04: origens reais diferentes continuam distintas", () => {
  assertNotEquals(origem("1.1.1.1, 203.0.113.9"), origem("1.1.1.1, 198.51.100.7"));
});

Deno.test("AV-04: com 2 proxies confiáveis, a origem é o 2º a partir da direita", () => {
  const cfg = { ...PADRAO, proxiesConfiaveis: 2 };
  // [forjado], cliente real, proxy confiável. Mudar o forjado não muda a origem; mudar o real, muda.
  assertEquals(origem("9.9.9.9, 203.0.113.9, 10.0.0.1", cfg), "203.0.113.9");
  assertEquals(origem("8.8.8.8, 203.0.113.9, 10.0.0.1", cfg), "203.0.113.9");
  assertEquals(origem("9.9.9.9, 198.51.100.7, 10.0.0.1", cfg), "198.51.100.7");
});

Deno.test("AV-04: cabeçalho curto demais ou ausente NÃO cai no valor forjado", () => {
  const cfg = { ...PADRAO, proxiesConfiaveis: 2 };
  assertEquals(origem("1.1.1.1", cfg), "desconhecido");
  assertEquals(origem("2.2.2.2", cfg), "desconhecido");
  assertEquals(origem(null, cfg), "desconhecido");
  assertEquals(origem("", cfg), "desconhecido");
});

Deno.test("AV-04: cabeçalho de IP da plataforma vence x-forwarded-for; ausente, volta ao x-forwarded-for", () => {
  const cfg = { ...PADRAO, cabecalhoIp: "cf-connecting-ip" };
  assertEquals(origem("1.1.1.1, 10.0.0.1", cfg, { "cf-connecting-ip": "203.0.113.9" }), "203.0.113.9");
  assertEquals(origem("2.2.2.2, 10.0.0.1", cfg, { "cf-connecting-ip": "203.0.113.9" }), "203.0.113.9");
  assertEquals(origem("2.2.2.2, 10.0.0.1", cfg), "10.0.0.1");
});

Deno.test("AV-04: configuração lida do ambiente — válida, inválida e ausente", () => {
  const env = (m: Record<string, string>) => (k: string) => m[k];
  assertEquals(lerConfigOrigem(env({})), { proxiesConfiaveis: 1, cabecalhoIp: null });
  assertEquals(lerConfigOrigem(env({ RATE_LIMIT_PROXIES_CONFIAVEIS: "2" })).proxiesConfiaveis, 2);
  assertEquals(
    lerConfigOrigem(env({ RATE_LIMIT_IP_HEADER: " CF-Connecting-IP " })).cabecalhoIp,
    "cf-connecting-ip",
  );
  // Inválido volta ao padrão seguro (1) — nunca ao primeiro elemento, nunca a "confiar em tudo".
  for (const valor of ["0", "-1", "abc", "", "99"]) {
    assertEquals(
      lerConfigOrigem(env({ RATE_LIMIT_PROXIES_CONFIAVEIS: valor })).proxiesConfiaveis,
      1,
      `valor ${JSON.stringify(valor)}`,
    );
  }
});

Deno.test("a chave é um hash: nem o IP nem o telefone aparecem em claro", async () => {
  const chave = await chaveHash("203.0.113.9", "sessao-login", "segredo");
  assert(/^[0-9a-f]{64}$/.test(chave));
  assert(!chave.includes("203"));
});

Deno.test("a chave muda com o sujeito, a rota e o segredo — e é estável para os mesmos", async () => {
  const base = await chaveHash("203.0.113.9", "sessao-login", "segredo");
  assertEquals(await chaveHash("203.0.113.9", "sessao-login", "segredo"), base);
  assertNotEquals(await chaveHash("198.51.100.7", "sessao-login", "segredo"), base);
  assertNotEquals(await chaveHash("203.0.113.9", "lead-capturar", "segredo"), base);
  assertNotEquals(await chaveHash("203.0.113.9", "sessao-login", "outro"), base);
});

Deno.test("AV-05: cota por contato — conta e telefone diferentes não dividem balde", async () => {
  const id = (conta: string, tel: string) => chaveHash(`id:${conta}:${tel}`, "agente-ia-contato", "s");
  assertEquals(await id("conta1", "5511999990000"), await id("conta1", "5511999990000"));
  assertNotEquals(await id("conta1", "5511999990000"), await id("conta1", "5511999990001"));
  assertNotEquals(await id("conta1", "5511999990000"), await id("conta2", "5511999990000"));
});

Deno.test("a identidade nunca colide com uma origem de rede de mesmo texto", async () => {
  // `id:` separa os dois espaços de chave: um contato chamado "203.0.113.9" não consome o balde do IP.
  assertNotEquals(
    await chaveHash("203.0.113.9", "agente-ia-contato", "s"),
    await chaveHash("id:203.0.113.9", "agente-ia-contato", "s"),
  );
});
