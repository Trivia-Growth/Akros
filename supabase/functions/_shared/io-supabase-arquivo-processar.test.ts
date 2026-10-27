import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { criarIOArquivoProcessar } from "./io-supabase-arquivo-processar.ts";

Deno.test("processador recupera leases e remove temporário confirmado pela API do Storage", async () => {
  const chamadas: Array<{ url: string; metodo: string; corpo: string }> = [];
  const client = createClient("https://supabase.example", "chave-ficticia", {
    global: { fetch: (input, init) => {
      const url = String(input);
      const metodo = init?.method ?? "GET";
      chamadas.push({ url, metodo, corpo: String(init?.body ?? "") });
      let corpo = "{}";
      if (url.includes("liberar_leases_expiradas")) corpo = "1";
      else if (url.includes("adquirir_trabalho_pendente")) corpo = "[]";
      else if (metodo === "GET" && url.includes("/versoes")) corpo = JSON.stringify([{ id: "versao-1", objeto_temporario: "cliente/arquivo.pdf" }]);
      else if (url.includes("/storage/v1/object/envios")) corpo = "[]";
      return Promise.resolve(new Response(corpo, { status: 200, headers: { "Content-Type": "application/json" } }));
    } },
  });
  const trabalho = await criarIOArquivoProcessar(client).adquirirTrabalho("worker-1");
  assertEquals(trabalho, null);
  assertEquals(chamadas.map((c) => c.metodo), ["POST", "GET", "DELETE", "PATCH", "POST"]);
  assertStringIncludes(chamadas[0].url, "liberar_leases_expiradas");
  assertStringIncludes(decodeURIComponent(chamadas[1].url), "estado_armazenamento=eq.armazenado");
  assertStringIncludes(decodeURIComponent(chamadas[1].url), "trabalhos_transferencia.estado=eq.concluido");
  assertStringIncludes(decodeURIComponent(chamadas[1].url), "item_id=not.is.null");
  assertStringIncludes(chamadas[2].url, "/storage/v1/object/envios");
  assertStringIncludes(chamadas[2].corpo, "cliente/arquivo.pdf");
  assertStringIncludes(decodeURIComponent(chamadas[3].url), "objeto_temporario=eq.cliente/arquivo.pdf");
});

Deno.test("erro do Storage preserva referência e processador continua disponível", async () => {
  const metodos: string[] = [];
  const client = createClient("https://supabase.example", "chave-ficticia", {
    global: { fetch: (input, init) => {
      const url = String(input);
      const metodo = init?.method ?? "GET";
      metodos.push(metodo);
      const falhou = url.includes("/storage/v1/object/envios");
      const corpo = falhou ? '{"message":"erro"}' : url.includes("liberar_leases_expiradas") ? "0"
        : url.includes("adquirir_trabalho_pendente") ? "[]"
        : JSON.stringify([{ id: "versao-1", objeto_temporario: "cliente/arquivo.pdf" }]);
      return Promise.resolve(new Response(corpo, { status: falhou ? 500 : 200, headers: { "Content-Type": "application/json" } }));
    } },
  });
  assertEquals(await criarIOArquivoProcessar(client).adquirirTrabalho("worker-1"), null);
  assertEquals(metodos, ["POST", "GET", "DELETE", "POST"]);
});
