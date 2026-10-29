// envio-comandos.test.ts — E03-S07 (Fase 5/US2, T061). Deno test, só fakes: nenhum teste aqui
// toca Postgres real nem Storage real (a prova contra Postgres real das RPCs está em
// supabase/tests/10-rpc-envio-comandos_test.sql, rodada via psql contra `crm_test`). Mesmo
// estilo de `caso-comandos/caso-comandos.test.ts`.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HttpError } from "../_shared/auth.ts";
import {
  criarManipuladorEnvioComandos,
  type IOEnvioComandos,
  type ReservaEnvioInfo,
  type RespostaRpc,
} from "../_shared/envio-comandos.ts";
import type { ObjetoEnvio } from "../_shared/io-storage-envios.ts";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SOLICITACAO_ID = "22222222-2222-4222-8222-222222222222";
const VERSAO_ID = "33333333-3333-4333-8333-333333333333";

interface Espiao {
  rpc: number;
  chamadas: Array<{ nome: string; params: Record<string, unknown> }>;
  gravacoes: number;
  obterReservaChamadas: number;
  obterObjetoChamadas: number;
}

const PDF_VALIDO = new TextEncoder().encode("%PDF-1.4\n...resto do arquivo...");

function montar(
  a: {
    auth?: "ok" | "401";
    admin?: boolean;
    limite?: boolean;
    rpcErro?: { code?: string; message: string } | null;
    autorizacaoErro?: { code?: string; message: string } | null;
    rpcResultado?: unknown;
    reserva?: ReservaEnvioInfo | null;
    objeto?: ObjetoEnvio | null;
  } = {},
): { h: (req: Request) => Promise<Response>; e: Espiao } {
  const e: Espiao = { rpc: 0, chamadas: [], gravacoes: 0, obterReservaChamadas: 0, obterObjetoChamadas: 0 };
  const idempotenciaMapa = new Map<string, { hashConteudo: string; resultado: unknown }>();

  const io: IOEnvioComandos = {
    limite: () => Promise.resolve({ permitido: a.limite ?? true, reiniciaEm: null }),
    autenticar: () => {
      if (a.auth === "401") return Promise.reject(new HttpError(401, "Token inválido"));
      return Promise.resolve({ userId: USER_ID, admin: a.admin ?? false });
    },
    idempotencia: {
      buscar: (chave) => Promise.resolve(idempotenciaMapa.get(chave) ?? null),
      gravar: (chave, hashConteudo, resultado) => {
        e.gravacoes++;
        idempotenciaMapa.set(chave, { hashConteudo, resultado });
        return Promise.resolve();
      },
    },
    storage: {
      obterObjeto: () => {
        e.obterObjetoChamadas++;
        return Promise.resolve(a.objeto === undefined ? { tamanhoBytes: PDF_VALIDO.byteLength, primeirosBytes: PDF_VALIDO } : a.objeto);
      },
    },
    obterReserva: () => {
      e.obterReservaChamadas++;
      return Promise.resolve(
        a.reserva === undefined
          ? { objetoPermitido: "cliente/versao.pdf", tamanhoDeclarado: PDF_VALIDO.byteLength, mimeDeclarado: "application/pdf" }
          : a.reserva,
      );
    },
    rpc: (nome, params): Promise<RespostaRpc<unknown>> => {
      if (String(nome) === "autorizar_finalizacao") {
        return Promise.resolve({ data: null, error: a.autorizacaoErro ?? null });
      }
      e.rpc++;
      e.chamadas.push({ nome, params });
      if (a.rpcErro) return Promise.resolve({ data: null, error: a.rpcErro });
      return Promise.resolve({ data: a.rpcResultado ?? defaultResultado(nome), error: null });
    },
  };
  return { h: criarManipuladorEnvioComandos(io), e };
}

function defaultResultado(nome: string): unknown {
  if (nome === "reservar_envio") {
    return [{ versao_id: VERSAO_ID, objeto_permitido: "cliente/versao.pdf", expira_em: "2026-10-22T00:00:00.000Z" }];
  }
  if (nome === "finalizar_envio") {
    return { id: VERSAO_ID, estado_recebimento: "recebida", estado_armazenamento: "pendente", recebido_em: "2026-10-21T12:00:00.000Z" };
  }
  return { id: "etapa-1", status: "em_analise", revisao: 2 };
}

const req = (corpo: unknown, headersExtra: Record<string, string> = { "x-akros-csrf": "1" }) =>
  new Request("https://p.supabase.co/functions/v1/envio-comandos", {
    method: "POST",
    headers: { Origin: "http://localhost:5173", Authorization: "Bearer token-de-teste", ...headersExtra },
    body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  });

const RESERVAR_ENVIO = {
  acao: "reservar_envio",
  solicitacaoId: SOLICITACAO_ID,
  nomeArquivo: "passaporte.pdf",
  tamanhoBytes: 123456,
  mime: "application/pdf",
};

const FINALIZAR_ENVIO = {
  acao: "finalizar_envio",
  versaoId: VERSAO_ID,
  idempotencyKey: "chave-finalizar-1",
  revisaoEsperada: 1,
};

const ENVIAR_ETAPA = {
  acao: "enviar_etapa_para_avaliacao",
  etapaId: "44444444-4444-4444-8444-444444444444",
  revisaoEsperada: 1,
};

Deno.test("finalização recusada antes da leitura do arquivo quando a reserva não pertence ao usuário", async () => {
  const { h, e } = montar({ autorizacaoErro: { code: "P0002", message: "não encontrado" } });
  const r = await h(req(FINALIZAR_ENVIO));
  assertEquals(r.status, 404);
  assertEquals(e.obterObjetoChamadas, 0);
  assertEquals(e.gravacoes, 0);
});

Deno.test("repetição idempotente volta a verificar acesso antes de retornar resultado", async () => {
  const opts: { autorizacaoErro: { code: string; message: string } | null } = { autorizacaoErro: null };
  const { h, e } = montar(opts);
  assertEquals((await h(req(FINALIZAR_ENVIO))).status, 200);
  opts.autorizacaoErro = { code: "P0002", message: "acesso revogado" };
  assertEquals((await h(req(FINALIZAR_ENVIO))).status, 404);
  assertEquals(e.obterObjetoChamadas, 1);
});

// ── CSRF / auth / schema básicos ─────────────────────────────────────────────────────────────

Deno.test("CSRF ausente é 401, antes de autenticar; RPC nunca chamada", async () => {
  const { h, e } = montar();
  const r = await h(req(RESERVAR_ENVIO, {}));
  assertEquals(r.status, 401);
  assertEquals(e.rpc, 0);
});

Deno.test("sessão inválida: 401, RPC nunca chamada", async () => {
  const { h, e } = montar({ auth: "401" });
  const r = await h(req(RESERVAR_ENVIO));
  assertEquals(r.status, 401);
  assertEquals(e.rpc, 0);
});

Deno.test("solicitacaoId e pagamentoId juntos (.superRefine): 422, RPC nunca chamada", async () => {
  const { h, e } = montar();
  const r = await h(req({ ...RESERVAR_ENVIO, pagamentoId: "55555555-5555-4555-8555-555555555555" }));
  assertEquals(r.status, 422);
  assertEquals(e.rpc, 0);
});

Deno.test("nem solicitacaoId nem pagamentoId (.superRefine): 422, RPC nunca chamada", async () => {
  const { h, e } = montar();
  const { solicitacaoId: _omitido, ...semDestino } = RESERVAR_ENVIO;
  const r = await h(req(semDestino));
  assertEquals(r.status, 422);
  assertEquals(e.rpc, 0);
});

Deno.test("corpo com campo extra (.strict()) é 422, RPC nunca chamada", async () => {
  const { h, e } = montar();
  const r = await h(req({ ...RESERVAR_ENVIO, campoNaoDeclarado: "x" }));
  assertEquals(r.status, 422);
  assertEquals(e.rpc, 0);
});

// ── reservar_envio: mapeamento de erro por código (T061) ─────────────────────────────────────

Deno.test("reservar_envio: fase bloqueada (RPC P0002) é 404, não confirma existência", async () => {
  const { h } = montar({ rpcErro: { code: "P0002", message: "fase ainda nao liberada" } });
  const r = await h(req(RESERVAR_ENVIO));
  assertEquals(r.status, 404);
  const corpo = await r.json();
  assertEquals(corpo.erro, "Não encontrado");
});

Deno.test("reservar_envio: papel sem direito (RPC 42501) é 403", async () => {
  const { h } = montar({ rpcErro: { code: "42501", message: "papel sem autoridade" } });
  const r = await h(req(RESERVAR_ENVIO));
  assertEquals(r.status, 403);
});

Deno.test("reservar_envio: acima do limite (RPC 54000) é 413", async () => {
  const { h } = montar({ rpcErro: { code: "54000", message: "arquivo acima do limite" } });
  const r = await h(req(RESERVAR_ENVIO));
  assertEquals(r.status, 413);
});

Deno.test("reservar_envio: mime não-PDF (RPC 22023) é 422", async () => {
  const { h } = montar({ rpcErro: { code: "22023", message: "apenas PDF" } });
  const r = await h(req({ ...RESERVAR_ENVIO, mime: "image/png" }));
  assertEquals(r.status, 422);
});

Deno.test("reservar_envio: sucesso devolve versaoId/objetoPermitido/expiraEm, nunca URL assinada", async () => {
  const { h, e } = montar({ admin: false });
  const r = await h(req(RESERVAR_ENVIO));
  assertEquals(r.status, 201);
  const corpo = await r.json();
  assertEquals(corpo, {
    versaoId: VERSAO_ID,
    objetoPermitido: "cliente/versao.pdf",
    expiraEm: "2026-10-22T00:00:00.000Z",
  });
  assertEquals(Object.keys(corpo).some((k) => k.toLowerCase().includes("url")), false);
  assertEquals(e.chamadas[0].nome, "reservar_envio");
  assertEquals(e.chamadas[0].params, {
    p_solicitacao_id: SOLICITACAO_ID,
    p_pagamento_id: null,
    p_nome_arquivo: "passaporte.pdf",
    p_tamanho_bytes: 123456,
    p_mime: "application/pdf",
    p_eh_admin: false,
    p_autor_id: USER_ID, // nunca aceito do corpo — sempre o userId da sessão
  });
});

Deno.test("reservar_envio: idempotencyKey não é exigida pelo schema (ação não é idempotente)", async () => {
  const { h } = montar();
  const r = await h(req(RESERVAR_ENVIO));
  assertEquals(r.status, 201);
});

Deno.test("reservar_envio: admin=true repassado como p_eh_admin à RPC", async () => {
  const { h, e } = montar({ admin: true });
  await h(req(RESERVAR_ENVIO));
  assertEquals(e.chamadas[0].params.p_eh_admin, true);
});

// ── finalizar_envio: verificação de Storage ANTES da RPC (T060/T061) ─────────────────────────

Deno.test("finalizar_envio: objeto ausente no Storage (fake devolve null) não confirma recebimento — 409, RPC nunca chamada", async () => {
  const { h, e } = montar({ objeto: null });
  const r = await h(req(FINALIZAR_ENVIO));
  assertEquals(r.status, 409);
  assertEquals(e.rpc, 0, "RPC não deveria ser chamada — versão não pode ser gravada como recebida");
});

Deno.test("finalizar_envio: tamanho do objeto diverge do declarado na reserva — 422, RPC nunca chamada", async () => {
  const { h, e } = montar({ objeto: { tamanhoBytes: 1, primeirosBytes: PDF_VALIDO } });
  const r = await h(req(FINALIZAR_ENVIO));
  assertEquals(r.status, 422);
  assertEquals(e.rpc, 0);
});

Deno.test("finalizar_envio: assinatura %PDF- ausente (arquivo não-PDF de verdade) — 422, RPC nunca chamada", async () => {
  const bytesNaoPdf = new TextEncoder().encode("não é um pdf de verdade");
  const { h, e } = montar({ objeto: { tamanhoBytes: bytesNaoPdf.byteLength, primeirosBytes: bytesNaoPdf } });
  const r = await h(req({ ...FINALIZAR_ENVIO, revisaoEsperada: 1 }));
  assertEquals(r.status, 422);
  assertEquals(e.rpc, 0);
});

Deno.test("finalizar_envio: reserva inexistente (obterReserva devolve null) — 404, RPC nunca chamada", async () => {
  const { h, e } = montar({ reserva: null });
  const r = await h(req(FINALIZAR_ENVIO));
  assertEquals(r.status, 404);
  assertEquals(e.rpc, 0);
});

Deno.test("finalizar_envio: revisão divergente (RPC 40001) é 409", async () => {
  const { h } = montar({ rpcErro: { code: "40001", message: "revisao esperada nao corresponde" } });
  const r = await h(req(FINALIZAR_ENVIO));
  assertEquals(r.status, 409);
});

Deno.test("finalizar_envio: sucesso devolve versaoId/recebidoEm/estadoArmazenamento=pendente", async () => {
  const { h, e } = montar();
  const r = await h(req(FINALIZAR_ENVIO));
  assertEquals(r.status, 200);
  const corpo = await r.json();
  assertEquals(corpo, { versaoId: VERSAO_ID, recebidoEm: "2026-10-21T12:00:00.000Z", estadoArmazenamento: "pendente" });
  assertEquals(e.chamadas[0].nome, "finalizar_envio");
  assertEquals(e.chamadas[0].params, { p_versao_id: VERSAO_ID, p_revisao_esperada: 1, p_autor_id: USER_ID });
});

Deno.test(
  "finalizar_envio: idempotencyKey repetida com o mesmo corpo devolve o mesmo resultado, sem criar segunda versão (RPC chamada uma única vez)",
  async () => {
    const { h, e } = montar();
    const r1 = await h(req(FINALIZAR_ENVIO));
    const r2 = await h(req(FINALIZAR_ENVIO));
    assertEquals(r1.status, 200);
    assertEquals(await r1.clone().json(), await r2.json());
    assertEquals(e.rpc, 1, "segunda chamada não deveria invocar a RPC de novo");
    assertEquals(e.obterObjetoChamadas, 1, "segunda chamada não deveria nem reverificar o Storage");
  },
);

Deno.test("finalizar_envio: idempotencyKey repetida com corpo diferente: 409", async () => {
  const { h } = montar();
  const r1 = await h(req(FINALIZAR_ENVIO));
  assertEquals(r1.status, 200);
  const r2 = await h(req({ ...FINALIZAR_ENVIO, revisaoEsperada: 2 }));
  assertEquals(r2.status, 409);
});

// ── enviar_etapa_para_avaliacao ───────────────────────────────────────────────────────────────

Deno.test("enviar_etapa_para_avaliacao: sucesso chama a RPC certa, sem p_eh_admin", async () => {
  const { h, e } = montar();
  const r = await h(req(ENVIAR_ETAPA));
  assertEquals(r.status, 200);
  assertEquals(e.chamadas[0].nome, "enviar_etapa_para_avaliacao");
  assertEquals(e.chamadas[0].params, {
    p_etapa_id: ENVIAR_ETAPA.etapaId,
    p_revisao_esperada: 1,
    p_autor_id: USER_ID,
  });
});

Deno.test("enviar_etapa_para_avaliacao: revisão divergente (RPC 40001) é 409", async () => {
  const { h } = montar({ rpcErro: { code: "40001", message: "revisao esperada nao corresponde" } });
  const r = await h(req(ENVIAR_ETAPA));
  assertEquals(r.status, 409);
});

Deno.test("enviar_etapa_para_avaliacao: etapa fora de 'pendente' (RPC 55000) é 409", async () => {
  const { h } = montar({ rpcErro: { code: "55000", message: "etapa nao esta pendente" } });
  const r = await h(req(ENVIAR_ETAPA));
  assertEquals(r.status, 409);
});

// AV-06: a presença de `checarLimite` no arquivo não prova que o handler a consulta. Este teste prova.
Deno.test("AV-06: limite de uso é 429 com Retry-After, antes de autenticar (RPC nunca chamada)", async () => {
  const { h, e } = montar({ limite: false });
  const r = await h(req(RESERVAR_ENVIO));
  assertEquals(r.status, 429);
  assertEquals(typeof r.headers.get("retry-after"), "string");
  assertEquals(e.rpc, 0);
  assertEquals(e.obterReservaChamadas, 0);
  assertEquals(e.gravacoes, 0);
});
