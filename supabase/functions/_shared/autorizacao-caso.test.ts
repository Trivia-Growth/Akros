import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HttpError } from "./auth.ts";
import { exigirPapel, resolverParticipacao, type IOAutorizacaoCaso, type Participacao } from "./autorizacao-caso.ts";

const AUTH_USER_ID = "22222222-2222-4222-8222-222222222222";

const PARTICIPACOES: Participacao[] = [
  { clienteId: "caso-A", papel: "aplicante" },
  { clienteId: "caso-B", papel: "beneficiario" },
  { clienteId: "caso-C", papel: "familiar_apoio" },
];

function montarIO(participacoes: Participacao[] = PARTICIPACOES): IOAutorizacaoCaso {
  return {
    participacoesDoUsuario: (authUserId) => {
      assertEquals(authUserId, AUTH_USER_ID);
      return Promise.resolve(participacoes);
    },
  };
}

Deno.test("resolverParticipacao sem clienteId devolve todas as participações do usuário", async () => {
  const io = montarIO();
  const r = await resolverParticipacao(io, AUTH_USER_ID);
  assertEquals(r, PARTICIPACOES);
});

Deno.test("resolverParticipacao com clienteId que o usuário não participa devolve lista vazia, sem lançar", async () => {
  const io = montarIO();
  const r = await resolverParticipacao(io, AUTH_USER_ID, { clienteId: "caso-Z" });
  assertEquals(r, []);
});

Deno.test("resolverParticipacao com clienteId de caso que o usuário participa filtra para essa participação", async () => {
  const io = montarIO();
  const r = await resolverParticipacao(io, AUTH_USER_ID, { clienteId: "caso-B" });
  assertEquals(r, [{ clienteId: "caso-B", papel: "beneficiario" }]);
});

Deno.test("exigirPapel com papel correto devolve a Participacao", async () => {
  const io = montarIO();
  const r = await exigirPapel(io, AUTH_USER_ID, "caso-A", ["aplicante"]);
  assertEquals(r, { clienteId: "caso-A", papel: "aplicante" });
});

Deno.test("exigirPapel com papel errado (participa do caso, papel diferente) lança 403", async () => {
  const io = montarIO();
  let erro: unknown;
  try {
    await exigirPapel(io, AUTH_USER_ID, "caso-B", ["aplicante"]);
  } catch (e) {
    erro = e;
  }
  assert(erro instanceof HttpError);
  assertEquals((erro as HttpError).status, 403);
});

Deno.test("exigirPapel com caso que o usuário não participa lança 404, não 403", async () => {
  const io = montarIO();
  let erro: unknown;
  try {
    await exigirPapel(io, AUTH_USER_ID, "caso-Z", ["aplicante"]);
  } catch (e) {
    erro = e;
  }
  assert(erro instanceof HttpError);
  assertEquals((erro as HttpError).status, 404);
});

// Vínculo legado mono-titular (papel: null) — crm.meus_casos() inclui, crm.meus_papeis() não.
// exigirPapel precisa tratar isso como "participa do caso, mas sem papel reconhecido": 403, nunca
// autorizado para nenhum papel específico, mesmo quando o papel pedido é "aplicante" (o papel que
// o vínculo legado teria na prática, se migrado) — ver comentário em Participacao.papel.
Deno.test("exigirPapel com único vínculo legado (papel null) lança 403 mesmo pedindo aplicante", async () => {
  const io = montarIO([{ clienteId: "caso-legado", papel: null }]);
  let erro: unknown;
  try {
    await exigirPapel(io, AUTH_USER_ID, "caso-legado", ["aplicante"]);
  } catch (e) {
    erro = e;
  }
  assert(erro instanceof HttpError);
  assertEquals((erro as HttpError).status, 403);
});

Deno.test("resolverParticipacao inclui o vínculo legado (papel null) na lista — leitura do caso continua funcionando", async () => {
  const io = montarIO([{ clienteId: "caso-legado", papel: null }]);
  const r = await resolverParticipacao(io, AUTH_USER_ID, { clienteId: "caso-legado" });
  assertEquals(r, [{ clienteId: "caso-legado", papel: null }]);
});
