import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HttpError } from "./auth.ts";
import { comIdempotencia, type IOIdempotencia } from "./idempotencia.ts";

function montarIO(): { io: IOIdempotencia; mapa: Map<string, { hashConteudo: string; resultado: unknown }> } {
  const mapa = new Map<string, { hashConteudo: string; resultado: unknown }>();
  const io: IOIdempotencia = {
    buscar: (chave) => Promise.resolve(mapa.get(chave) ?? null),
    gravar: (chave, hashConteudo, resultado) => {
      mapa.set(chave, { hashConteudo, resultado });
      return Promise.resolve();
    },
  };
  return { io, mapa };
}

Deno.test("chave nova: chama processar, grava o resultado e devolve", async () => {
  const { io, mapa } = montarIO();
  let chamadas = 0;
  const resultado = await comIdempotencia(io, "registrar_contrato", "k1", { a: 1 }, "admin-1", () => {
    chamadas++;
    return Promise.resolve({ ok: true });
  });
  assertEquals(resultado, { ok: true });
  assertEquals(chamadas, 1);
  assertEquals(mapa.size, 1);
});

Deno.test("mesma chave, mesmo conteúdo: devolve resultado gravado sem reprocessar", async () => {
  const { io } = montarIO();
  let chamadas = 0;
  const processar = () => {
    chamadas++;
    return Promise.resolve({ ok: true, chamada: chamadas });
  };

  const r1 = await comIdempotencia(io, "registrar_contrato", "k1", { a: 1 }, "admin-1", processar);
  const r2 = await comIdempotencia(io, "registrar_contrato", "k1", { a: 1 }, "admin-1", processar);

  assertEquals(r1, { ok: true, chamada: 1 });
  assertEquals(r2, r1);
  assertEquals(chamadas, 1);
});

Deno.test("mesma chave, conteúdo diferente: 409 e processar não é chamado de novo", async () => {
  const { io } = montarIO();
  let chamadas = 0;
  const processar = () => {
    chamadas++;
    return Promise.resolve({ ok: true });
  };

  await comIdempotencia(io, "registrar_contrato", "k1", { a: 1 }, "admin-1", processar);
  assertEquals(chamadas, 1);

  let erro: unknown;
  try {
    await comIdempotencia(io, "registrar_contrato", "k1", { a: 2 }, "admin-1", processar);
  } catch (e) {
    erro = e;
  }

  assert(erro instanceof HttpError);
  assertEquals((erro as HttpError).status, 409);
  assertEquals(chamadas, 1, "processar não deve ser chamado de novo em conflito de idempotência");
});

Deno.test("chave efetiva isola por nomeAcao: mesma chave bruta em ações diferentes não colide", async () => {
  const { io } = montarIO();
  let chamadas = 0;
  const processar = () => {
    chamadas++;
    return Promise.resolve({ chamada: chamadas });
  };

  await comIdempotencia(io, "registrar_contrato", "mesma-chave", { a: 1 }, "admin-1", processar);
  await comIdempotencia(io, "cadastrar_cobranca", "mesma-chave", { a: 1 }, "admin-1", processar);

  assertEquals(chamadas, 2, "ações diferentes com a mesma chave bruta não devem compartilhar cache");
});
