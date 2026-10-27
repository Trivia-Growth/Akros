import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { criarIOGraphMicrosoftReal } from "./graph-microsoft.ts";

Deno.test("Graph aceita pasta e recusa arquivo como destino do caso", async () => {
  const anterior = globalThis.fetch;
  try {
    let itemEhPasta = false;
    globalThis.fetch = (entrada) => Promise.resolve(new Response(JSON.stringify({
      ...(!String(entrada).includes("/items/raiz?") ? { parentReference: { id: "raiz" } } : {}), ...(itemEhPasta ? { folder: {} } : { file: {} }),
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const graph = criarIOGraphMicrosoftReal({ tenantId: "tenant", clientId: "client", clientSecret: "fake" });
    await assertRejects(() => graph.listarAncestrais({ accessToken: "token", driveId: "drive", itemId: "arquivo" }));
    itemEhPasta = true;
    globalThis.fetch = (entrada) => {
      const raiz = String(entrada).includes("/items/raiz?");
      return Promise.resolve(new Response(JSON.stringify(raiz ? { folder: {} } : { folder: {}, parentReference: { id: "raiz" } }), {
        status: 200, headers: { "Content-Type": "application/json" },
      }));
    };
    assertEquals(await graph.listarAncestrais({ accessToken: "token", driveId: "drive", itemId: "pasta" }), ["raiz"]);
  } finally {
    globalThis.fetch = anterior;
  }
});
