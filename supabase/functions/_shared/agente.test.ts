import { assert, assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type DepsAgente, precisaDeHumano, processarEntrada } from "./agente.ts";
import type { EntradaCanal } from "./canais/tipos.ts";
import type { RegraAgente } from "./openrouter.ts";

const REGRA: RegraAgente = {
  id: "ag-1", nome_agente: "Ana", funcao: "triagem", alma: "Acolha.", saudacao: "Olá",
  mensagem_handoff: "Vou encaminhar para a equipe.", llm: { provedor: "openrouter", modelo: "m" },
};
const ENTRADA: EntradaCanal = {
  origemId: "m1", contatoExterno: "5511988881001", nome: "Maria", texto: "Oi, quero saber do EB-2",
  ocorridoEm: "2026-10-01T10:00:00.000Z",
};

interface Chamadas {
  enviados: string[];
  concluidos: Array<{ status: string; textoSaida?: string; custo?: number | null }>;
  ia: number;
  registros: number;
  logs: Array<Record<string, unknown>>;
}

function montar(over: Partial<DepsAgente> = {}): { deps: DepsAgente; c: Chamadas } {
  const c: Chamadas = { enviados: [], concluidos: [], ia: 0, registros: 0, logs: [] };
  const deps: DepsAgente = {
    vincularCliente: () => Promise.resolve({ id: "cli-1", nome: "Maria Cliente" }),
    registrar: () => {
      c.registros++;
      return Promise.resolve({ processar: true, conversaId: "conv-1" });
    },
    concluir: (a) => {
      c.concluidos.push({ status: a.status, textoSaida: a.textoSaida, custo: a.custo });
      return Promise.resolve();
    },
    agenteDaConta: () => Promise.resolve(REGRA),
    chaveOpenRouter: () => Promise.resolve("sk-or"),
    historico: () => Promise.resolve([]),
    gerarResposta: () => {
      c.ia++;
      return Promise.resolve({ texto: "Olá! Posso ajudar.", custo: 0.002 });
    },
    enviar: (t) => {
      c.enviados.push(t);
      return Promise.resolve();
    },
    log: (e) => {
      c.logs.push(e);
    },
    ...over,
  };
  return { deps, c };
}
const OPCOES = { contaAtiva: true, limiteSaida: 1600 };

Deno.test("responde: envia o texto da IA uma vez e fecha como respondido com o custo", async () => {
  const { deps, c } = montar();
  assertEquals(await processarEntrada(deps, ENTRADA, OPCOES), "respondido");
  assertEquals(c.enviados, ["Olá! Posso ajudar."]);
  assertEquals(c.concluidos, [{ status: "respondido", textoSaida: "Olá! Posso ajudar.", custo: 0.002 }]);
});

Deno.test("reentrega do mesmo evento: não chama IA, não envia, não fecha de novo", async () => {
  const { deps, c } = montar({ registrar: () => Promise.resolve({ processar: false, conversaId: null }) });
  assertEquals(await processarEntrada(deps, ENTRADA, OPCOES), "duplicada");
  assertEquals([c.ia, c.enviados.length, c.concluidos.length], [0, 0, 0]);
});

Deno.test("pede humano: envia o encaminhamento e NÃO chama a IA", async () => {
  for (const texto of ["quero falar com um advogado", "Preciso do JURÍDICO", "boleto do pagamento", "falar com uma pessoa"]) {
    const { deps, c } = montar();
    assertEquals(await processarEntrada(deps, { ...ENTRADA, texto }, OPCOES), "handoff", texto);
    assertEquals(c.enviados, ["Vou encaminhar para a equipe."]);
    assertEquals(c.ia, 0);
    assertEquals(c.concluidos[0].status, "handoff");
  }
});

Deno.test("'consulta' sozinho NÃO encaminha: é o primeiro contato típico de um lead", async () => {
  const { deps, c } = montar();
  assertEquals(await processarEntrada(deps, { ...ENTRADA, texto: "Quero marcar uma consulta" }, OPCOES), "respondido");
  assertEquals(c.ia, 1);
});

Deno.test("precisaDeHumano ignora acento e caixa, e não casa parte de palavra", () => {
  assert(precisaDeHumano("Falar com ATENDENTE"));
  assert(precisaDeHumano("preciso de um advogada"));
  assert(precisaDeHumano("questão jurídica"));
  assert(!precisaDeHumano("gostaria de informações sobre vistos"));
  assert(!precisaDeHumano("meu humanoide"), "'humano' só como palavra inteira");
});

Deno.test("sem agente ativo, conta inativa ou sem chave: registra, não responde, fecha como ignorado", async () => {
  const casos: Array<[string, Partial<DepsAgente>, typeof OPCOES]> = [
    ["sem agente", { agenteDaConta: () => Promise.resolve(null) }, OPCOES],
    ["conta inativa", {}, { ...OPCOES, contaAtiva: false }],
    ["sem chave", { chaveOpenRouter: () => Promise.resolve(null) }, OPCOES],
  ];
  for (const [nome, over, opcoes] of casos) {
    const { deps, c } = montar(over);
    assertEquals(await processarEntrada(deps, ENTRADA, opcoes), "ignorado", nome);
    assertEquals([c.ia, c.enviados.length], [0, 0], nome);
    assertEquals(c.concluidos.map((x) => x.status), ["ignorado"], nome);
  }
});

Deno.test("IA falha: fecha como falhou, não envia, não lança (provedor não deve reentregar)", async () => {
  const { deps, c } = montar({ gerarResposta: () => Promise.reject(new Error("OpenRouter respondeu 500")) });
  assertEquals(await processarEntrada(deps, ENTRADA, OPCOES), "falhou");
  assertEquals(c.enviados, []);
  assertEquals(c.concluidos.map((x) => x.status), ["falhou"]);
});

Deno.test("envio falha: fecha como falhou e nunca como respondido", async () => {
  const { deps, c } = montar({ enviar: () => Promise.reject(new Error("evolution respondeu 500")) });
  assertEquals(await processarEntrada(deps, ENTRADA, OPCOES), "falhou");
  assertEquals(c.concluidos.map((x) => x.status), ["falhou"]);
});

Deno.test("fechar o recibo também falha: não lança e não duplica envio", async () => {
  const { deps, c } = montar({ concluir: () => Promise.reject(new Error("banco fora")) });
  assertEquals(await processarEntrada(deps, ENTRADA, OPCOES), "falhou");
  assertEquals(c.enviados.length, 1);
});

Deno.test("log da falha não carrega o texto do cliente nem a mensagem do erro", async () => {
  const { deps, c } = montar({ gerarResposta: () => Promise.reject(new Error("chave sk-or-SEGREDO 5511988881001")) });
  await processarEntrada(deps, { ...ENTRADA, texto: "meu passaporte é X123456" }, OPCOES);
  const log = JSON.stringify(c.logs);
  assert(!log.includes("SEGREDO") && !log.includes("X123456") && !log.includes("5511988881001"), log);
});

Deno.test("falha ao vincular ou registrar PROPAGA: nada foi gravado, o provedor pode reentregar", async () => {
  const a = montar({ vincularCliente: () => Promise.reject(new Error("banco")) });
  await assertRejects(() => processarEntrada(a.deps, ENTRADA, OPCOES));
  assertEquals(a.c.registros, 0);
  const b = montar({ registrar: () => Promise.reject(new Error("banco")) });
  await assertRejects(() => processarEntrada(b.deps, ENTRADA, OPCOES));
  assertEquals(b.c.enviados.length, 0);
});

Deno.test("resposta acima do limite do canal é truncada antes do envio", async () => {
  const { deps, c } = montar({ gerarResposta: () => Promise.resolve({ texto: "x".repeat(5000), custo: null }) });
  await processarEntrada(deps, ENTRADA, { contaAtiva: true, limiteSaida: 900 });
  assertEquals(c.enviados[0].length, 900);
  assertEquals(c.concluidos[0].textoSaida?.length, 900);
});

Deno.test("contato desconhecido registra sem cliente e usa o nome do perfil", async () => {
  let recebido: { clienteId: string | null; clienteNome: string } | null = null;
  const { deps } = montar({
    vincularCliente: () => Promise.resolve(null),
    registrar: (a) => {
      recebido = { clienteId: a.clienteId, clienteNome: a.clienteNome };
      return Promise.resolve({ processar: true, conversaId: "c" });
    },
  });
  await processarEntrada(deps, ENTRADA, OPCOES);
  assertEquals(recebido, { clienteId: null, clienteNome: "Maria" });
  const { deps: d2 } = montar({
    vincularCliente: () => Promise.resolve(null),
    registrar: (a) => {
      recebido = { clienteId: a.clienteId, clienteNome: a.clienteNome };
      return Promise.resolve({ processar: true, conversaId: "c" });
    },
  });
  await processarEntrada(d2, { ...ENTRADA, nome: null }, OPCOES);
  assertEquals(recebido, { clienteId: null, clienteNome: "Contato" });
});

// ── decidirResposta: a mesma decisão da produção e do Playground (E13-S14) ──
import { decidirResposta } from "./agente.ts";

Deno.test("decidirResposta: encaminha sem consultar chave nem chamar a IA", async () => {
  let chaves = 0;
  let ia = 0;
  const deps = {
    chaveOpenRouter: () => { chaves++; return Promise.resolve("k"); },
    gerarResposta: () => { ia++; return Promise.resolve({ texto: "x", custo: null }); },
  };
  const d = await decidirResposta(deps, REGRA, "preciso de um advogado", [], 1600);
  assertEquals(d, { tipo: "handoff", texto: "Vou encaminhar para a equipe." });
  assertEquals([chaves, ia], [0, 0]);
});

Deno.test("decidirResposta: sem chave não chama a IA; com chave devolve texto truncado e custo", async () => {
  let ia = 0;
  const gerar = () => { ia++; return Promise.resolve({ texto: "y".repeat(3000), custo: 0.5 }); };
  assertEquals(await decidirResposta({ chaveOpenRouter: () => Promise.resolve(null), gerarResposta: gerar }, REGRA, "oi", [], 900), { tipo: "sem_chave" });
  assertEquals(ia, 0);
  const d = await decidirResposta({ chaveOpenRouter: () => Promise.resolve("k"), gerarResposta: gerar }, REGRA, "oi", [], 900);
  assertEquals(d.tipo === "resposta" && d.texto.length, 900);
  assertEquals(d.tipo === "resposta" && d.custo, 0.5);
});
