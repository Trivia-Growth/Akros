import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HttpError } from "./auth.ts";
import { ErroIA, type RegraAgente } from "./openrouter.ts";
import { criarManipuladorPlayground, type IOPlayground } from "./playground.ts";

const AGENTE_ID = "11111111-1111-4111-8111-111111111111";
const REGRA: RegraAgente = {
  id: AGENTE_ID, nome_agente: "Ana", funcao: "triagem", alma: "Acolha o cliente com calma.",
  saudacao: "Olá", mensagem_handoff: "Vou chamar a equipe.", llm: { provedor: "openrouter", modelo: "openai/gpt-4.1-mini" },
};

interface Espiao { ia: number; historicos: unknown[]; consultas: number }

function montar(a: {
  admin?: "ok" | "401" | "403";
  limite?: boolean;
  agente?: RegraAgente | null;
  chave?: string | null;
  iaErro?: Error;
} = {}): { h: (req: Request) => Promise<Response>; e: Espiao } {
  const e: Espiao = { ia: 0, historicos: [], consultas: 0 };
  let relogio = 1000;
  const io: IOPlayground = {
    limite: () => Promise.resolve({ permitido: a.limite ?? true, reiniciaEm: null }),
    autenticarAdmin: () => {
      e.consultas++;
      if (a.admin === "401") return Promise.reject(new HttpError(401, "Token inválido"));
      if (a.admin === "403") return Promise.reject(new HttpError(403, "Apenas administradores"));
      return Promise.resolve();
    },
    carregarAgente: () => {
      e.consultas++;
      return Promise.resolve(a.agente === undefined ? REGRA : a.agente);
    },
    deps: {
      chaveOpenRouter: () => Promise.resolve(a.chave === undefined ? "sk-or-SEGREDO" : a.chave),
      gerarResposta: (_r, _c, historico) => {
        e.ia++;
        e.historicos.push(historico);
        if (a.iaErro) return Promise.reject(a.iaErro);
        return Promise.resolve({ texto: "Olá! Posso ajudar com o EB-2 NIW.", custo: 0.0012 });
      },
    },
    agora: () => (relogio += 150),
  };
  return { h: criarManipuladorPlayground(io), e };
}

const req = (corpo: unknown, headers: Record<string, string> = { "x-akros-csrf": "1" }) =>
  new Request("https://p.supabase.co/functions/v1/agente-playground", {
    method: "POST", headers: { Origin: "http://localhost:5173", ...headers },
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });
const ENTRADA = { agenteId: AGENTE_ID, mensagens: [], texto: "Oi, quero saber do EB-2 NIW" };

Deno.test("resposta normal: texto, custo, modelo, tempo e as instruções que o modelo recebe", async () => {
  const { h, e } = montar();
  const r = await h(req(ENTRADA));
  assertEquals(r.status, 200);
  const j = await r.json();
  assertEquals([j.tipo, j.resposta, j.custo, j.modelo], ["resposta", "Olá! Posso ajudar com o EB-2 NIW.", 0.0012, "openai/gpt-4.1-mini"]);
  assertEquals(j.ms, 150);
  assert(j.instrucoes.includes("Acolha o cliente com calma.") && j.instrucoes.includes("não dá aconselhamento jurídico"));
  assertEquals(e.ia, 1);
});

Deno.test("envia ao modelo a conversa de teste mais a mensagem nova, igual à produção", async () => {
  const { h, e } = montar();
  await h(req({ ...ENTRADA, mensagens: [{ autor: "cliente", texto: "Oi" }, { autor: "agente_ia", texto: "Olá!" }], texto: "E o prazo?" }));
  assertEquals(e.historicos[0], [
    { autor: "cliente", texto: "Oi" },
    { autor: "agente_ia", texto: "Olá!" },
    { autor: "cliente", texto: "E o prazo?" },
  ]);
});

Deno.test("pedido que exige a equipe: devolve o encaminhamento e NÃO chama a IA (nem gasta crédito)", async () => {
  const { h, e } = montar();
  for (const texto of ["quero falar com um advogado", "boleto do pagamento"]) {
    const j = await (await h(req({ ...ENTRADA, texto }))).json();
    assertEquals([j.tipo, j.resposta, j.custo], ["handoff", "Vou chamar a equipe.", null]);
  }
  assertEquals(e.ia, 0);
});

Deno.test("agente desligado ainda pode ser testado (teste vem antes de ligar)", async () => {
  const { h } = montar({ agente: { ...REGRA } });
  assertEquals((await h(req(ENTRADA))).status, 200);
});

Deno.test("segurança: CSRF ausente é 401; não-admin é 401/403; nada é consultado sem autenticar", async () => {
  const a = montar();
  assertEquals((await a.h(req(ENTRADA, {}))).status, 401);
  assertEquals(a.e.consultas, 0);
  assertEquals((await montar({ admin: "401" }).h(req(ENTRADA))).status, 401);
  const c = montar({ admin: "403" });
  assertEquals((await c.h(req(ENTRADA))).status, 403);
  assertEquals([c.e.ia, c.e.consultas], [0, 1], "cliente logado não chega ao agente nem à IA");
});

Deno.test("limite de uso é 429 com Retry-After, antes de qualquer outra coisa", async () => {
  const { h, e } = montar({ limite: false });
  const r = await h(req(ENTRADA));
  assertEquals(r.status, 429);
  assert(r.headers.get("retry-after"));
  assertEquals(e.consultas, 0);
});

Deno.test("entrada inválida: campo extra, autor desconhecido, texto vazio/grande, histórico longo, JSON ruim", async () => {
  const { h, e } = montar();
  const ruins: unknown[] = [
    { ...ENTRADA, extra: 1 },
    { ...ENTRADA, agenteId: "nao-uuid" },
    { ...ENTRADA, texto: "   " },
    { ...ENTRADA, texto: "x".repeat(2001) },
    { ...ENTRADA, mensagens: [{ autor: "sistema", texto: "oi" }] },
    { ...ENTRADA, mensagens: Array.from({ length: 21 }, () => ({ autor: "cliente", texto: "oi" })) },
    "{{{",
  ];
  for (const corpo of ruins) assertEquals((await h(req(corpo))).status, 400, JSON.stringify(corpo)?.slice(0, 60));
  assertEquals(e.ia, 0);
  const grande = await h(req(JSON.stringify({ ...ENTRADA, texto: "a".repeat(70000) })));
  assertEquals(grande.status, 413);
});

Deno.test("agente inexistente é 404; sem chave OpenRouter é 400 com instrução, sem chamar a IA", async () => {
  assertEquals((await montar({ agente: null }).h(req(ENTRADA))).status, 404);
  const { h, e } = montar({ chave: null });
  const r = await h(req(ENTRADA));
  assertEquals(r.status, 400);
  assert((await r.json()).erro.includes("chave OpenRouter"));
  assertEquals(e.ia, 0);
});

Deno.test("erros da OpenRouter viram 502 com a causa em português; a chave nunca aparece", async () => {
  const casos: Array<[number, string]> = [
    [401, "recusou a chave"], [402, "Sem crédito"], [404, "não aceitou o modelo"], [429, "Limite de uso"], [503, "indisponível"],
  ];
  for (const [status, trecho] of casos) {
    const { h } = montar({ iaErro: new ErroIA(`OpenRouter respondeu ${status}`, status) });
    const r = await h(req(ENTRADA));
    assertEquals(r.status, 502);
    const corpo = await r.text();
    assert(corpo.includes(trecho), `${status}: ${corpo}`);
    assert(!corpo.includes("SEGREDO"));
  }
});

Deno.test("falha inesperada: 500 genérico, sem vazar o erro original", async () => {
  const { h } = montar({ iaErro: new Error("conexão com sk-or-SEGREDO caiu") });
  const r = await h(req(ENTRADA));
  assertEquals(r.status, 500);
  const corpo = await r.text();
  assert(!corpo.includes("SEGREDO") && !corpo.includes("conexão"));
});

Deno.test("OPTIONS responde o preflight e outros métodos são 405", async () => {
  const { h } = montar();
  assertEquals((await h(new Request("https://p/f", { method: "OPTIONS", headers: { Origin: "http://localhost:5173" } }))).status, 204);
  assertEquals((await h(new Request("https://p/f", { method: "GET" }))).status, 405);
});
