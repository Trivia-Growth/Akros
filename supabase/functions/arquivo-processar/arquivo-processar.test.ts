// arquivo-processar.test.ts (T072) — testa `_shared/arquivo-processar.ts` com fakes de
// `IOArquivoProcessar`/`IOGraphMicrosoft`. Nenhum teste aqui toca Postgres real — a prova de
// lease concorrente (T072, "lease impede dois processadores de pegarem o mesmo trabalho
// simultaneamente") é feita contra `crm_test` com DUAS sessões `psql` reais (ver relatório desta
// task), não é alcançável com um fake Deno (um fake não tem corrida real de duas conexões).
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  criarManipuladorArquivoProcessar,
  processarUmTrabalho,
  MOTIVO_RECONECTAR,
  MOTIVO_QUOTA,
  MOTIVO_PASTA_AUSENTE,
  type IOArquivoProcessar,
  type ContextoTransferencia,
  type TrabalhoLease,
} from "../_shared/arquivo-processar.ts";
import { GraphError, type IOGraphMicrosoft, type SegredoMicrosoftGraph } from "../_shared/graph-microsoft.ts";

const SEGREDO_GRAPH: SegredoMicrosoftGraph = {
  refreshToken: "refresh-xyz",
  clientId: "client-1",
  clientSecret: "secret-1",
  tenantId: "tenant-1",
};

const TRABALHO: TrabalhoLease = { trabalhoId: "trabalho-1", versaoId: "versao-1", tentativas: 0 };

const CONTEXTO: ContextoTransferencia = {
  versaoId: "versao-1",
  clienteId: "cliente-1",
  documentoId: "documento-1",
  pagamentoId: null,
  tamanhoBytes: 10,
  objetoTemporario: "cliente-1/versao-1.pdf",
  integracaoId: "integracao-1",
  driveId: "drive-1",
  folderItemId: "pasta-caso-1",
  pastaRaizItemId: "pasta-raiz-1",
};

interface Espiao {
  marcados: Array<{ tipo: string; args: unknown }>;
  segredosSalvos: Array<{ escopo: string; valor: Record<string, string> }>;
  segredoSessaoDescartado: string[];
  progresso: Array<{ trabalhoId: string; bytesEnviados: number; sessaoReferencia: string | null }>;
}

function montarIO(a: {
  trabalho?: TrabalhoLease | null;
  contexto?: ContextoTransferencia | { ok: false; motivo: string };
  segredoGraph?: SegredoMicrosoftGraph | null;
  bytesObjeto?: Uint8Array;
} = {}): { io: IOArquivoProcessar; e: Espiao } {
  const e: Espiao = { marcados: [], segredosSalvos: [], segredoSessaoDescartado: [], progresso: [] };
  const trabalho = a.trabalho === undefined ? TRABALHO : a.trabalho;
  const resultadoContexto =
    a.contexto === undefined
      ? { ok: true as const, contexto: CONTEXTO }
      : "ok" in a.contexto
        ? a.contexto
        : { ok: true as const, contexto: a.contexto as ContextoTransferencia };

  const io: IOArquivoProcessar = {
    adquirirTrabalho: () => Promise.resolve(trabalho),
    carregarContexto: () => Promise.resolve(resultadoContexto),
    obterSegredoVault: () => Promise.resolve(a.segredoGraph === undefined ? SEGREDO_GRAPH : a.segredoGraph),
    salvarSegredoVault: (escopo, valor) => {
      e.segredosSalvos.push({ escopo, valor });
      return Promise.resolve();
    },
    descartarSegredoSessao: (versaoId) => {
      e.segredoSessaoDescartado.push(versaoId);
      return Promise.resolve();
    },
    baixarObjetoTemporario: () => Promise.resolve(a.bytesObjeto ?? new Uint8Array(CONTEXTO.tamanhoBytes).fill(1)),
    atualizarProgresso: (trabalhoId, bytesEnviados, sessaoReferencia) => {
      e.progresso.push({ trabalhoId, bytesEnviados, sessaoReferencia });
      return Promise.resolve();
    },
    marcarConcluido: (args) => {
      e.marcados.push({ tipo: "concluido", args });
      return Promise.resolve();
    },
    marcarFalhaTransitoria: (args) => {
      e.marcados.push({ tipo: "falha_transitoria", args });
      return Promise.resolve();
    },
    marcarBloqueado: (args) => {
      e.marcados.push({ tipo: "bloqueado", args });
      return Promise.resolve();
    },
  };
  return { io, e };
}

function montarGraph(a: {
  validarAncestralidade?: boolean;
  itemExistente?: { itemId: string; tamanhoBytes: number } | null;
  erroAoTrocarToken?: GraphError;
  erroAoEnviarFragmento?: GraphError;
} = {}): IOGraphMicrosoft {
  return {
    trocarRefreshPorAccessToken: () => {
      if (a.erroAoTrocarToken) return Promise.reject(a.erroAoTrocarToken);
      return Promise.resolve({ accessToken: "access-token-1", refreshTokenNovo: null });
    },
    validarAncestralidade: () => Promise.resolve(a.validarAncestralidade ?? true),
    buscarItemPorNome: () => Promise.resolve(a.itemExistente === undefined ? null : a.itemExistente),
    criarSessaoUpload: () => Promise.resolve({ uploadUrl: "https://upload.example.com/sessao-1" }),
    enviarFragmento: (args) => {
      if (a.erroAoEnviarFragmento) return Promise.reject(a.erroAoEnviarFragmento);
      return Promise.resolve({ concluido: true, itemId: "item-final-1" });
    },
    baixarConteudo: () => Promise.resolve(new Uint8Array()),
  };
}

Deno.test("sem segredo de serviço → 401", async () => {
  const { HttpError } = await import("../_shared/auth.ts");
  const handler = criarManipuladorArquivoProcessar({
    autenticarServico: () => {
      throw new HttpError(401, "Chamada interna não autorizada");
    },
    limite: () => Promise.resolve({ permitido: true, reiniciaEm: null }),
    io: montarIO().io,
    graph: montarGraph(),
  });
  const resposta = await handler(new Request("https://fn.local/arquivo-processar", { method: "POST" }));
  assertEquals(resposta.status, 401);
});

Deno.test("segredo errado → 401 (mesmo caminho HTTP que 'sem segredo')", async () => {
  // `requireServiceRole` real (_shared/auth.ts) compara em tempo constante contra as chaves
  // privilegiadas via `Deno.env` — não exercitado aqui porque o runner de teste
  // (`test:functions`) só concede `--allow-env=CORS_ALLOWED_ORIGINS` (sem acesso a
  // `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEYS`). O que importa para T072 é que o
  // manipulador responde 401 sempre que `autenticarServico` recusa — mesmo teste acima cobre
  // "sem segredo"; aqui simulamos "segredo errado" (token presente, mas inválido).
  const { HttpError } = await import("../_shared/auth.ts");
  const handler = criarManipuladorArquivoProcessar({
    autenticarServico: (req) => {
      if (req.headers.get("Authorization") !== "Bearer chave-correta") {
        throw new HttpError(401, "Chamada interna não autorizada");
      }
    },
    limite: () => Promise.resolve({ permitido: true, reiniciaEm: null }),
    io: montarIO().io,
    graph: montarGraph(),
  });
  const resposta = await handler(
    new Request("https://fn.local/arquivo-processar", {
      method: "POST",
      headers: { Authorization: "Bearer chave-errada" },
    }),
  );
  assertEquals(resposta.status, 401);
});

Deno.test("sem trabalho pendente → processado=false, nenhuma chamada ao Graph", async () => {
  const { io, e } = montarIO({ trabalho: null });
  const resultado = await processarUmTrabalho({ io, graph: montarGraph() });
  assertEquals(resultado, { processado: false });
  assertEquals(e.marcados.length, 0);
});

Deno.test("indisponibilidade da Microsoft (erro de rede) mantém pendente, nunca bloqueia", async () => {
  const { io, e } = montarIO();
  const graph = montarGraph({
    erroAoTrocarToken: new GraphError("rede", "fetch failed: ECONNREFUSED"),
  });
  const resultado = await processarUmTrabalho({ io, graph, agora: () => new Date("2026-01-01T00:00:00Z") });
  assertEquals(resultado.resultado, "falha_transitoria");
  assertEquals(e.marcados.length, 1);
  assertEquals(e.marcados[0].tipo, "falha_transitoria");
  const args = e.marcados[0].args as { tentativas: number; proximaTentativaEm: Date };
  assertEquals(args.tentativas, 1);
  // backoff = min(2^1, 60) = 2 minutos
  assertEquals(args.proximaTentativaEm.toISOString(), "2026-01-01T00:02:00.000Z");
});

Deno.test("erro de rede genérico (não GraphError) também é transitório, nunca bloqueia", async () => {
  const { io, e } = montarIO();
  const graph: IOGraphMicrosoft = {
    ...montarGraph(),
    trocarRefreshPorAccessToken: () => Promise.reject(new Error("network error")),
  };
  const resultado = await processarUmTrabalho({ io, graph, agora: () => new Date("2026-01-01T00:00:00Z") });
  assertEquals(resultado.resultado, "falha_transitoria");
  assertEquals(e.marcados.every((m) => m.tipo !== "bloqueado"), true);
});

Deno.test("401 do Graph bloqueia com motivo 'reconectar conta Microsoft'", async () => {
  const { io, e } = montarIO();
  const graph = montarGraph({ erroAoTrocarToken: new GraphError("auth", "401 Unauthorized") });
  const resultado = await processarUmTrabalho({ io, graph });
  assertEquals(resultado, { processado: true, resultado: "bloqueado", motivo: MOTIVO_RECONECTAR });
  assertEquals(e.marcados, [{ tipo: "bloqueado", args: { trabalhoId: "trabalho-1", motivo: MOTIVO_RECONECTAR } }]);
});

Deno.test("quota excedida bloqueia com motivo 'quota do OneDrive excedida'", async () => {
  const { io, e } = montarIO();
  const graph = montarGraph({ erroAoEnviarFragmento: new GraphError("quota", "507 Insufficient Storage") });
  const resultado = await processarUmTrabalho({ io, graph });
  assertEquals(resultado.resultado, "bloqueado");
  assertEquals(resultado.motivo, MOTIVO_QUOTA);
  assertEquals(e.marcados.some((m) => m.tipo === "bloqueado"), true);
});

Deno.test("pasta ausente (ancestralidade falha) bloqueia com motivo próprio", async () => {
  const { io, e } = montarIO();
  const graph = montarGraph({ validarAncestralidade: false });
  const resultado = await processarUmTrabalho({ io, graph });
  assertEquals(resultado, { processado: true, resultado: "bloqueado", motivo: MOTIVO_PASTA_AUSENTE });
  void e;
});

Deno.test("vínculo de pasta ausente no carregamento de contexto bloqueia com motivo próprio", async () => {
  const { io } = montarIO({ contexto: { ok: false, motivo: MOTIVO_PASTA_AUSENTE } });
  const resultado = await processarUmTrabalho({ io, graph: montarGraph() });
  assertEquals(resultado, { processado: true, resultado: "bloqueado", motivo: MOTIVO_PASTA_AUSENTE });
});

Deno.test("resposta perdida reconcilia pelo item determinístico, sem criar segunda sessão", async () => {
  const { io, e } = montarIO();
  let sessaoCriada = false;
  const graph: IOGraphMicrosoft = {
    ...montarGraph({ itemExistente: { itemId: "item-ja-existe", tamanhoBytes: CONTEXTO.tamanhoBytes } }),
    criarSessaoUpload: () => {
      sessaoCriada = true;
      return Promise.resolve({ uploadUrl: "https://nao-deveria-ser-chamado.example.com" });
    },
  };
  const resultado = await processarUmTrabalho({ io, graph });
  assertEquals(resultado, { processado: true, resultado: "reconciliado" });
  assertEquals(sessaoCriada, false);
  assertEquals(e.marcados, [
    {
      tipo: "concluido",
      args: { trabalhoId: "trabalho-1", versaoId: "versao-1", itemId: "item-ja-existe", driveId: "drive-1" },
    },
  ]);
});

Deno.test("item existente com tamanho diferente NÃO reconcilia — cria sessão nova", async () => {
  const { io } = montarIO();
  let sessaoCriada = false;
  const graph: IOGraphMicrosoft = {
    ...montarGraph({ itemExistente: { itemId: "item-parcial", tamanhoBytes: 1 } }),
    criarSessaoUpload: () => {
      sessaoCriada = true;
      return Promise.resolve({ uploadUrl: "https://upload.example.com/sessao-nova" });
    },
  };
  const resultado = await processarUmTrabalho({ io, graph });
  assertEquals(sessaoCriada, true);
  assertEquals(resultado.resultado, "concluido");
});

Deno.test("upload completo grava item_id, estado armazenado e descarta segredo da sessão", async () => {
  const { io, e } = montarIO();
  const graph = montarGraph();
  const resultado = await processarUmTrabalho({ io, graph });
  assertEquals(resultado, { processado: true, resultado: "concluido" });
  assertEquals(e.marcados, [
    { tipo: "concluido", args: { trabalhoId: "trabalho-1", versaoId: "versao-1", itemId: "item-final-1", driveId: "drive-1" } },
  ]);
  assertEquals(e.segredoSessaoDescartado, ["versao-1"]);
  // nunca persiste a URL de sessão em claro fora do Vault — só o escopo entra em `salvarSegredoVault`.
  assertEquals(
    e.segredosSalvos.some((s) => s.escopo === "upload-sessao:versao-1"),
    true,
  );
});

Deno.test("sem segredo microsoft-graph no Vault bloqueia com 'reconectar conta Microsoft'", async () => {
  const { io, e } = montarIO({ segredoGraph: null });
  const resultado = await processarUmTrabalho({ io, graph: montarGraph() });
  assertEquals(resultado, { processado: true, resultado: "bloqueado", motivo: MOTIVO_RECONECTAR });
  assertEquals(e.marcados.length, 1);
});
