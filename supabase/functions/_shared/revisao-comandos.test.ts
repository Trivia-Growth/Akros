// revisao-comandos.test.ts — E03-S07 (Fase 6/US3). Teste mínimo exigido pelo gate
// `check-edge-functions` (AV-06): toda função que consulta o limitador precisa de um teste que
// afirme 429 quando o limite nega, antes de qualquer outra coisa (RPC nunca chamada).
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { IORevisaoComandos } from "./revisao-comandos.ts";
import { criarManipuladorRevisaoComandos } from "./revisao-comandos.ts";

function montarIOLimiteNegado(): { io: IORevisaoComandos; chamadasRpc: number } {
  let chamadasRpc = 0;
  const io: IORevisaoComandos = {
    limite: () => Promise.resolve({ permitido: false, reiniciaEm: new Date(Date.now() + 30_000) }),
    autenticarAdmin: () => Promise.resolve({ userId: "11111111-1111-4111-8111-111111111111" }),
    idempotencia: {
      buscar: () => Promise.resolve(null),
      gravar: () => Promise.resolve(),
    },
    rpc: () => {
      chamadasRpc += 1;
      return Promise.resolve({ data: null, error: null });
    },
  };
  return { io, chamadasRpc };
}

Deno.test("limite de uso é 429 com Retry-After, antes de autenticar (RPC nunca chamada)", async () => {
  const espiao = montarIOLimiteNegado();
  const handler = criarManipuladorRevisaoComandos(espiao.io);
  const resposta = await handler(
    new Request("https://exemplo.test/revisao-comandos", { method: "POST", body: "{}" }),
  );
  assertEquals(resposta.status, 429);
  assertEquals(resposta.headers.has("Retry-After"), true);
  assertEquals(espiao.chamadasRpc, 0);
});
