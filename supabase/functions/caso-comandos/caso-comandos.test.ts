// caso-comandos.test.ts — E03-S07 (T032, estendido em T046-T048 para
// convidar_participante/revogar_participante/solicitar_documento). Deno test, só fakes: nenhum
// teste aqui toca Postgres real (a prova contra Postgres real das cinco ações está em
// task-031-032-report.md e task-046-048-report.md, rodada manualmente contra `crm_test`). Mesmo
// estilo de `_shared/playground.test.ts`.
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
const PARTICIPANTE_ID = "44444444-4444-4444-8444-444444444444";
const FASE_ID = "55555555-5555-4555-8555-555555555555";
const OUTRO_PARTICIPANTE_ID = "66666666-6666-4666-8666-666666666666";

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

const req = (corpo: unknown, headersExtra: Record<string, string> = { "x-akros-csrf": "1" }) =>
  new Request("https://p.supabase.co/functions/v1/caso-comandos", {
    method: "POST",
    headers: { Origin: "http://localhost:5173", Authorization: "Bearer token-de-teste", ...headersExtra },
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

const CONVIDAR_PARTICIPANTE = {
  acao: "convidar_participante",
  clienteId: CLIENTE_ID,
  papel: "aplicante",
  sujeitoTipo: "titular",
  nomeExibicao: "Fulano Aplicante",
  email: "fulano@teste.com",
  idempotencyKey: "chave-3",
};

const REVOGAR_PARTICIPANTE = {
  acao: "revogar_participante",
  participanteId: PARTICIPANTE_ID,
  idempotencyKey: "chave-4",
};

const SOLICITAR_DOCUMENTO = {
  acao: "solicitar_documento",
  clienteId: CLIENTE_ID,
  faseId: FASE_ID,
  requisitoTipo: "passaporte",
  sujeitoTipo: "participante",
  sujeitoParticipanteId: PARTICIPANTE_ID,
  titulo: "Envie seu passaporte",
  prazoEm: "2026-12-01",
  instrucao: "Enviar cópia colorida",
  idempotencyKey: "chave-5",
};

Deno.test("CSRF ausente é 401, antes de autenticar; RPC nunca chamada", async () => {
  const { h, e } = montar();
  const r = await h(req(REGISTRAR_CONTRATO, {}));
  assertEquals(r.status, 401);
  assertEquals(e.rpc, 0);
});

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

Deno.test("RPC retorna erro simulado com code 23505 (unique_violation): resposta HTTP é 409", async () => {
  const { h } = montar({ rpcErro: { code: "23505", message: "duplicate key value violates unique constraint" } });
  const r = await h(req(REGISTRAR_CONTRATO));
  assertEquals(r.status, 409);
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

// ── convidar_participante (T046-T048, US6/ADR-0018) ─────────────────────────────────────────

Deno.test("convidar_participante: papel fora do enum Zod é 422 antes de chegar na RPC", async () => {
  const { h, e } = montar();
  const r = await h(req({ ...CONVIDAR_PARTICIPANTE, papel: "advogado" }));
  assertEquals(r.status, 422);
  assertEquals(e.rpc, 0);
});

Deno.test(
  "convidar_participante: RPC recusa com 22023 (papel fora do conjunto do programa) → 422, mensagem genérica",
  async () => {
    const { h } = montar({
      rpcErro: { code: "22023", message: "papel fora do conjunto do programa" },
    });
    const r = await h(req(CONVIDAR_PARTICIPANTE));
    assertEquals(r.status, 422);
    const corpo = await r.json();
    assertEquals(corpo, { erro: "Dados inválidos para esta operação" });
  },
);

Deno.test("convidar_participante: fluxo de sucesso chama a RPC certa com parâmetros snake_case", async () => {
  const { h, e } = montar({ rpcResultado: { id: "participante-novo", estado: "ativo", authUserId: null } });
  const r = await h(req(CONVIDAR_PARTICIPANTE));
  assertEquals(r.status, 201);
  assertEquals(e.chamadas.length, 1);
  assertEquals(e.chamadas[0].nome, "convidar_participante");
  assertEquals(e.chamadas[0].params, {
    p_cliente_id: CLIENTE_ID,
    p_papel: "aplicante",
    p_sujeito_tipo: "titular",
    p_familiar_id: null,
    p_organizacao_id: null,
    p_nome_exibicao: "Fulano Aplicante",
    p_email: "fulano@teste.com",
    p_autor_id: ADMIN_ID, // nunca aceito do corpo — sempre o userId da sessão
  });
});

// ── revogar_participante (T046-T048, FR-020) ────────────────────────────────────────────────

Deno.test("revogar_participante: fake de RPC confirma que só participanteId é passado — nada mais", async () => {
  const { h, e } = montar({ rpcResultado: { id: PARTICIPANTE_ID, estado: "revogado" } });
  const r = await h(req(REVOGAR_PARTICIPANTE));
  assertEquals(r.status, 200);
  assertEquals(e.chamadas.length, 1);
  assertEquals(e.chamadas[0].nome, "revogar_participante");
  assertEquals(e.chamadas[0].params, {
    p_participante_id: PARTICIPANTE_ID,
    p_autor_id: ADMIN_ID,
  });
  // Nenhum outro campo (ex.: clienteId, papel) chega à RPC — revogação é só por participante,
  // nunca por caso/papel (não afeta os demais participantes do mesmo caso).
  assertEquals(Object.keys(e.chamadas[0].params).sort(), ["p_autor_id", "p_participante_id"]);
});

Deno.test("revogar_participante: participanteId que não é UUID é 422, RPC nunca chamada", async () => {
  const { h, e } = montar();
  const r = await h(req({ ...REVOGAR_PARTICIPANTE, participanteId: "não-é-uuid" }));
  assertEquals(r.status, 422);
  assertEquals(e.rpc, 0);
});

// ── solicitar_documento (T046-T048, FR-016/FR-017/FR-018) ───────────────────────────────────

Deno.test(
  "solicitar_documento: corpo com papelDirigido/restrito/envioConjunto é 422 (.strict() recusa — " +
    "essas marcas só podem vir do catálogo do programa, nunca do corpo da requisição)",
  async () => {
    const { h, e } = montar();
    const r1 = await h(req({ ...SOLICITAR_DOCUMENTO, papelDirigido: "aplicante" }));
    assertEquals(r1.status, 422);
    const r2 = await h(req({ ...SOLICITAR_DOCUMENTO, restrito: true }));
    assertEquals(r2.status, 422);
    const r3 = await h(req({ ...SOLICITAR_DOCUMENTO, envioConjunto: true }));
    assertEquals(r3.status, 422);
    assertEquals(e.rpc, 0);
  },
);

Deno.test(
  "solicitar_documento: sujeito de outro caso — RPC fake retorna 22023 → 422",
  async () => {
    const { h } = montar({
      rpcErro: { code: "22023", message: "sujeito nao pertence ao caso" },
    });
    const r = await h(req({ ...SOLICITAR_DOCUMENTO, sujeitoParticipanteId: OUTRO_PARTICIPANTE_ID }));
    assertEquals(r.status, 422);
  },
);

Deno.test("solicitar_documento: fluxo de sucesso chama a RPC certa com parâmetros snake_case corretos", async () => {
  const { h, e } = montar({ rpcResultado: { id: "documento-novo", status: "pendente" } });
  const r = await h(req(SOLICITAR_DOCUMENTO));
  assertEquals(r.status, 201);
  assertEquals(e.chamadas.length, 1);
  assertEquals(e.chamadas[0].nome, "solicitar_documento");
  assertEquals(e.chamadas[0].params, {
    p_cliente_id: CLIENTE_ID,
    p_fase_id: FASE_ID,
    p_requisito_tipo: "passaporte",
    p_sujeito_tipo: "participante",
    p_sujeito_participante_id: PARTICIPANTE_ID,
    p_sujeito_familiar_id: null,
    p_titulo: "Envie seu passaporte",
    p_prazo_em: "2026-12-01",
    p_instrucao: "Enviar cópia colorida",
    p_autor_id: ADMIN_ID,
  });
});

Deno.test("solicitar_documento sem prazoEm/instrucao: p_prazo_em e p_instrucao vão null (nunca omitidos)", async () => {
  const { h, e } = montar({ rpcResultado: { id: "documento-novo" } });
  const { prazoEm: _p, instrucao: _i, ...semOpcionais } = SOLICITAR_DOCUMENTO;
  await h(req({ ...semOpcionais, idempotencyKey: "chave-outra-doc" }));
  assertEquals(e.chamadas[0].params.p_prazo_em, null);
  assertEquals(e.chamadas[0].params.p_instrucao, null);
});
