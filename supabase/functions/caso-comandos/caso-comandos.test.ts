// caso-comandos.test.ts — E03-S07 (T032). Deno test, só fakes: nenhum teste aqui toca Postgres
// real (a prova contra Postgres real está em task-031-032-report.md, rodada manualmente contra
// `crm_test`). Mesmo estilo de `_shared/playground.test.ts`.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HttpError } from "../_shared/auth.ts";
import {
  criarManipuladorCasoComandos,
  type IOCasoComandos,
  type RespostaRpc,
} from "../_shared/caso-comandos.ts";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "22222222-2222-4222-8222-222222222222";
const CONTRATO_ID = "33333333-3333-4333-8333-333333333333";

interface Espiao {
  rpc: number;
  chamadas: Array<{ nome: string; params: Record<string, unknown> }>;
  gravacoes: number;
}

function montar(a: {
  admin?: "ok" | "401" | "403";
  limite?: boolean;
  rpcErro?: { code?: string; message: string } | null;
  rpcResultado?: unknown;
} = {}): { h: (req: Request) => Promise<Response>; e: Espiao } {
  const e: Espiao = { rpc: 0, chamadas: [], gravacoes: 0 };
  const idempotenciaMapa = new Map<string, { hashConteudo: string; resultado: unknown }>();

  const io: IOCasoComandos = {
    limite: () => Promise.resolve({ permitido: a.limite ?? true, reiniciaEm: null }),
    autenticarAdmin: () => {
      if (a.admin === "401") return Promise.reject(new HttpError(401, "Token inválido"));
      if (a.admin === "403") return Promise.reject(new HttpError(403, "Apenas administradores"));
      return Promise.resolve({ userId: ADMIN_ID });
    },
    idempotencia: {
      buscar: (chave) => Promise.resolve(idempotenciaMapa.get(chave) ?? null),
      gravar: (chave, hashConteudo, resultado) => {
        e.gravacoes++;
        idempotenciaMapa.set(chave, { hashConteudo, resultado });
        return Promise.resolve();
      },
    },
    rpc: (nome, params): Promise<RespostaRpc<unknown>> => {
      e.rpc++;
      e.chamadas.push({ nome, params });
      if (a.rpcErro) return Promise.resolve({ data: null, error: a.rpcErro });
      return Promise.resolve({
        data: a.rpcResultado ?? { id: "contrato-novo", ok: true },
        error: null,
      });
    },
  };
  return { h: criarManipuladorCasoComandos(io), e };
}

const req = (corpo: unknown) =>
  new Request("https://p.supabase.co/functions/v1/caso-comandos", {
    method: "POST",
    headers: { Origin: "http://localhost:5173", Authorization: "Bearer token-de-teste" },
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });

const REGISTRAR_CONTRATO = {
  acao: "registrar_contrato",
  clienteId: CLIENTE_ID,
  programaId: "EB2NIW",
  programaVersao: "v1",
  prazoRespostaDiasUteis: 30,
  prioridade: "padrao",
  condicoes: [
    { descricao: "Entrada", tipo: "entrada", valor: 1000, moeda: "USD", vencimento: "2026-11-01", ordem: 1 },
  ],
  idempotencyKey: "chave-1",
};

const PREPARAR_CASO = {
  acao: "preparar_caso",
  clienteId: CLIENTE_ID,
  contratoId: CONTRATO_ID,
  levantamentoEstado: "conferido",
  idempotencyKey: "chave-2",
};

Deno.test("chamador sem papel admin: 401/403, RPC nunca chamada", async () => {
  const a = montar({ admin: "401" });
  assertEquals((await a.h(req(REGISTRAR_CONTRATO))).status, 401);
  assertEquals(a.e.rpc, 0);

  const b = montar({ admin: "403" });
  assertEquals((await b.h(req(REGISTRAR_CONTRATO))).status, 403);
  assertEquals(b.e.rpc, 0);
});

Deno.test("corpo com campo extra (.strict()) é 422, RPC nunca chamada", async () => {
  const { h, e } = montar();
  const r = await h(req({ ...REGISTRAR_CONTRATO, campoNaoDeclarado: "x" }));
  assertEquals(r.status, 422);
  assertEquals(e.rpc, 0);
});

Deno.test("condição com valor <= 0 é 422 (Zod recusa antes da RPC)", async () => {
  const { h, e } = montar();
  const corpo = {
    ...REGISTRAR_CONTRATO,
    condicoes: [{ descricao: "Entrada", tipo: "entrada", valor: 0, moeda: "USD", vencimento: "2026-11-01", ordem: 1 }],
  };
  assertEquals((await h(req(corpo))).status, 422);
  assertEquals(e.rpc, 0);
});

Deno.test("idempotencyKey repetida com o mesmo corpo: devolve o resultado anterior, RPC chamada uma única vez", async () => {
  const { h, e } = montar({ rpcResultado: { id: "contrato-1" } });
  const r1 = await h(req(REGISTRAR_CONTRATO));
  const r2 = await h(req(REGISTRAR_CONTRATO));
  assertEquals(r1.status, 201);
  assertEquals(await r1.clone().json(), await r2.json());
  assertEquals(e.rpc, 1, "segunda chamada não deveria invocar a RPC de novo");
});

Deno.test("idempotencyKey repetida com corpo diferente: 409", async () => {
  const { h, e } = montar();
  const r1 = await h(req(REGISTRAR_CONTRATO));
  assertEquals(r1.status, 201);
  const r2 = await h(req({ ...REGISTRAR_CONTRATO, observacao: "mudou o conteúdo" }));
  assertEquals(r2.status, 409);
  assertEquals(e.rpc, 1, "corpo divergente não deveria chegar a chamar a RPC de novo");
});

Deno.test("RPC retorna erro simulado com code 42501: resposta HTTP é 403 (não 500 genérico)", async () => {
  const { h } = montar({ rpcErro: { code: "42501", message: "registro de contrato negado" } });
  const r = await h(req(REGISTRAR_CONTRATO));
  assertEquals(r.status, 403);
});

Deno.test("RPC retorna erro simulado com code 22023: resposta HTTP é 422", async () => {
  const { h } = montar({ rpcErro: { code: "22023", message: "contrato inexistente ou nao pertence ao cliente" } });
  const r = await h(req(PREPARAR_CASO));
  assertEquals(r.status, 422);
});

Deno.test("RPC retorna erro de banco sem code conhecido: 500 genérico, sem vazar a mensagem", async () => {
  const { h } = montar({ rpcErro: { message: "relation crm.contratos has no column xyz" } });
  const r = await h(req(REGISTRAR_CONTRATO));
  assertEquals(r.status, 500);
  const corpo = await r.text();
  assertEquals(corpo.includes("xyz"), false);
});

Deno.test("registrar_contrato: fluxo de sucesso chama a RPC certa com p_autor_id = userId resolvido por requireAdmin", async () => {
  const { h, e } = montar({ rpcResultado: { id: "contrato-novo" } });
  const r = await h(req(REGISTRAR_CONTRATO));
  assertEquals(r.status, 201);
  assertEquals(await r.json(), { id: "contrato-novo" });
  assertEquals(e.chamadas.length, 1);
  assertEquals(e.chamadas[0].nome, "registrar_contrato");
  assertEquals(e.chamadas[0].params, {
    p_cliente_id: CLIENTE_ID,
    p_programa_id: "EB2NIW",
    p_programa_versao: "v1",
    p_prazo_resposta_dias_uteis: 30,
    p_prioridade: "padrao",
    p_observacao: null,
    p_condicoes: REGISTRAR_CONTRATO.condicoes,
    p_autor_id: ADMIN_ID, // nunca aceito do corpo — sempre o userId da sessão
  });
  assertEquals(e.gravacoes, 1);
});

Deno.test("preparar_caso: fluxo de sucesso chama a RPC certa com p_autor_id = userId resolvido por requireAdmin", async () => {
  const { h, e } = montar({ rpcResultado: { id: "jornada-nova" } });
  const r = await h(req(PREPARAR_CASO));
  assertEquals(r.status, 200);
  assertEquals(await r.json(), { id: "jornada-nova" });
  assertEquals(e.chamadas.length, 1);
  assertEquals(e.chamadas[0].nome, "preparar_caso");
  assertEquals(e.chamadas[0].params, {
    p_cliente_id: CLIENTE_ID,
    p_contrato_id: CONTRATO_ID,
    p_levantamento_estado: "conferido",
    p_autor_id: ADMIN_ID,
  });
});

Deno.test("preparar_caso sem levantamentoEstado: p_levantamento_estado vai null (nunca omitido)", async () => {
  const { h, e } = montar({ rpcResultado: { id: "jornada-nova" } });
  const { levantamentoEstado: _omitido, ...semLevantamento } = PREPARAR_CASO;
  await h(req({ ...semLevantamento, idempotencyKey: "chave-outra" }));
  assertEquals(e.chamadas[0].params.p_levantamento_estado, null);
});

Deno.test("limite de uso é 429 com Retry-After, antes de autenticar (RPC nunca chamada)", async () => {
  const { h, e } = montar({ limite: false });
  const r = await h(req(REGISTRAR_CONTRATO));
  assertEquals(r.status, 429);
  assertEquals(typeof r.headers.get("retry-after"), "string");
  assertEquals(e.rpc, 0);
});

Deno.test("método diferente de POST/OPTIONS é 405", async () => {
  const { h } = montar();
  const r = await h(new Request("https://p.supabase.co/functions/v1/caso-comandos", { method: "GET" }));
  assertEquals(r.status, 405);
});

Deno.test("OPTIONS responde 204 (preflight CORS), sem autenticar", async () => {
  const { h, e } = montar();
  const r = await h(new Request("https://p.supabase.co/functions/v1/caso-comandos", { method: "OPTIONS" }));
  assertEquals(r.status, 204);
  assertEquals(e.rpc, 0);
});

Deno.test("JSON malformado é 422, RPC nunca chamada", async () => {
  const { h, e } = montar();
  const r = await h(req("{{{não é json"));
  assertEquals(r.status, 422);
  assertEquals(e.rpc, 0);
});

Deno.test("acao desconhecida (fora da união discriminada) é 422", async () => {
  const { h, e } = montar();
  const r = await h(req({ acao: "cadastrar_cobranca", idempotencyKey: "x" }));
  assertEquals(r.status, 422);
  assertEquals(e.rpc, 0);
});
