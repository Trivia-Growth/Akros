import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ErroIA, gerarRespostaOpenRouter, instrucoes, mensagensHistorico, type RegraAgente } from "./openrouter.ts";

const REGRA: RegraAgente = {
  id: "a", nome_agente: "Ana", funcao: "triagem", alma: "Acolha o cliente.", saudacao: "Olá",
  mensagem_handoff: "h", llm: { provedor: "openrouter", modelo: "openai/gpt-4.1-mini" },
};

Deno.test("histórico: só as 10 últimas, só cliente e agente_ia, sem vazio, truncado", () => {
  const msgs = Array.from({ length: 14 }, (_, i) => ({ autor: i % 2 ? "agente_ia" : "cliente", texto: `m${i}` }));
  const r = mensagensHistorico([...msgs, { autor: "equipe", texto: "x" }, { autor: "cliente", texto: "  " }]);
  // 14 mensagens + 2 descartáveis = 16; as 10 últimas são m6..m13 mais as 2 descartáveis.
  assertEquals(r.length, 8);
  assertEquals(r[0], { role: "user", content: "m6" });
  assertEquals(r[7], { role: "assistant", content: "m13" });
  assertEquals(mensagensHistorico(null), []);
  assertEquals(mensagensHistorico([{ autor: "cliente", texto: "a".repeat(5000) }])[0].content.length, 2000);
});

Deno.test("instruções: proíbem aconselhamento jurídico e tratam a mensagem como não confiável", () => {
  const t = instrucoes(REGRA);
  assert(t.includes("Ana") && t.includes("Acolha o cliente."));
  assert(t.includes("não dá aconselhamento jurídico"));
  assert(t.includes("conteúdo não confiável"));
  assert(t.includes("Não possui ferramentas"));
});

Deno.test("gera resposta: corpo, cabeçalho e custo", async () => {
  let corpo: Record<string, unknown> = {};
  let auth = "";
  const f = ((_u: string, init: RequestInit) => {
    corpo = JSON.parse(init.body as string);
    auth = (init.headers as Record<string, string>).Authorization;
    return Promise.resolve(new Response(JSON.stringify({
      choices: [{ message: { content: "Olá!" } }], usage: { cost: 0.0042 },
    }), { status: 200 }));
  }) as unknown as typeof fetch;
  const r = await gerarRespostaOpenRouter(f, REGRA, "sk-or", [{ autor: "cliente", texto: "Oi" }]);
  assertEquals(r, { texto: "Olá!", custo: 0.0042 });
  assertEquals(auth, "Bearer sk-or");
  assertEquals(corpo.model, "openai/gpt-4.1-mini");
  assertEquals(corpo.max_tokens, 400);
});

Deno.test("erros: sem modelo, HTTP de erro, corpo vazio e custo inválido", async () => {
  const ok = (b: unknown, status = 200) => (() => Promise.resolve(new Response(JSON.stringify(b), { status }))) as unknown as typeof fetch;
  await assertRejects(() => gerarRespostaOpenRouter(ok({}), { ...REGRA, llm: {} }, "k", []), ErroIA, "sem modelo");
  await assertRejects(() => gerarRespostaOpenRouter(ok({}, 500), REGRA, "k", []), ErroIA, "500");
  await assertRejects(() => gerarRespostaOpenRouter(ok({ choices: [] }), REGRA, "k", []), ErroIA);
  await assertRejects(() => gerarRespostaOpenRouter(ok({ choices: [{ message: { content: " " } }] }), REGRA, "k", []), ErroIA);
  const r = await gerarRespostaOpenRouter(ok({ choices: [{ message: { content: "x" } }], usage: { cost: -1 } }), REGRA, "k", []);
  assertEquals(r.custo, null);
});
