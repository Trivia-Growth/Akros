import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { RevisaoObsoleta, verificarRevisao } from "./revisao.ts";

Deno.test("verificarRevisao(0, atual): lança RevisaoObsoleta com a revisão atual e status 409", () => {
  let erro: unknown;
  try {
    verificarRevisao(0, 5);
  } catch (e) {
    erro = e;
  }
  assert(erro instanceof RevisaoObsoleta);
  assertEquals((erro as RevisaoObsoleta).revisaoAtual, 5);
  assertEquals((erro as RevisaoObsoleta).status, 409);
});

Deno.test("verificarRevisao(1, atual): não lança — UPDATE afetou a linha esperada", () => {
  verificarRevisao(1, 5);
});
