import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { urlBaseNormalizada, validarUrlServidor } from "./evolution-url.ts";

const publico = (...ips: string[]) => ({ resolverEnderecos: () => Promise.resolve(ips) });

Deno.test("aceita HTTPS cujo nome resolve só para endereços públicos", async () => {
  const r = await validarUrlServidor("https://evo.exemplo.com", publico("203.0.114.9", "2606:4700::1"));
  assertEquals(r.valida, true);
});

Deno.test("recusa o que não é HTTPS, tem credencial, consulta ou fragmento", async () => {
  for (
    const url of [
      "http://evo.exemplo.com",
      "https://user:senha@evo.exemplo.com",
      "https://evo.exemplo.com/?k=1",
      "https://evo.exemplo.com/#x",
      "ftp://evo.exemplo.com",
      "nao-e-url",
    ]
  ) {
    assertEquals((await validarUrlServidor(url, publico("203.0.114.9"))).valida, false, url);
  }
});

Deno.test("recusa loopback, rede privada, link-local, metadados e nomes locais", async () => {
  for (
    const url of [
      "https://127.0.0.1",
      "https://10.1.2.3",
      "https://172.20.0.5",
      "https://192.168.0.10",
      "https://169.254.169.254",
      "https://100.64.0.1",
      "https://[::1]",
      "https://[fd00::1]",
      "https://[fe80::1]",
      "https://[::ffff:127.0.0.1]",
      "https://[::ffff:7f00:1]",
      "https://localhost",
      "https://api.localhost",
      "https://servidor.local",
      "https://x.internal",
      "https://2130706433", // decimal ⇒ 127.0.0.1 depois da normalização do URL
    ]
  ) {
    assertEquals((await validarUrlServidor(url, publico("203.0.114.9"))).valida, false, url);
  }
});

Deno.test("recusa nome que resolve (ainda que em parte) para rede privada — DNS rebinding", async () => {
  assertEquals((await validarUrlServidor("https://evo.exemplo.com", publico("203.0.114.9", "10.0.0.7"))).valida, false);
  assertEquals((await validarUrlServidor("https://evo.exemplo.com", publico("::1"))).valida, false);
  assertEquals((await validarUrlServidor("https://evo.exemplo.com", publico())).valida, false);
});

Deno.test("sem resolvedor ou com erro de DNS, falha fechado", async () => {
  assertEquals((await validarUrlServidor("https://evo.exemplo.com")).valida, false);
  const r = await validarUrlServidor("https://evo.exemplo.com", {
    resolverEnderecos: () => Promise.reject(new Error("dns")),
  });
  assertEquals(r.valida, false);
});

Deno.test("IP público literal passa sem DNS", async () => {
  assertEquals((await validarUrlServidor("https://203.0.114.9")).valida, true);
});

Deno.test("urlBaseNormalizada tira a barra final e preserva prefixo", () => {
  assertEquals(urlBaseNormalizada("https://evo.exemplo.com/"), "https://evo.exemplo.com");
  assertEquals(urlBaseNormalizada("https://evo.exemplo.com/api/"), "https://evo.exemplo.com/api");
  assert(!urlBaseNormalizada("https://EVO.exemplo.com").endsWith("/"));
});
