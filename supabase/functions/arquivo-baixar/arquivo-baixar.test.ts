// arquivo-baixar.test.ts (T074) — testa `_shared/arquivo-baixar.ts` com fakes de
// `IOArquivoBaixar`/`IOGraphMicrosoftTransferencia`. Nenhum teste aqui toca Postgres real.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { criarManipuladorArquivoBaixar, type IOArquivoBaixar, type VersaoParaDownload } from "../_shared/arquivo-baixar.ts";
import type { Participacao, IOAutorizacaoCaso } from "../_shared/autorizacao-caso.ts";
import type { IOGraphMicrosoftTransferencia, SegredoMicrosoftGraph } from "../_shared/graph-microsoft.ts";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const CLIENTE_ID = "22222222-2222-4222-8222-222222222222";
const SEGREDO: SegredoMicrosoftGraph = {
  refreshToken: "r",
  clientId: "c",
  clientSecret: "s",
  tenantId: "t",
};

const VERSAO_BASE: VersaoParaDownload = {
  id: "versao-1",
  clienteId: CLIENTE_ID,
  documentoId: "documento-1",
  pagamentoId: null,
  contratoId: null,
  nomeOriginal: "passaporte.pdf",
  driveId: "drive-1",
  itemId: "item-1",
  estadoArmazenamento: "armazenado",
};

function montarIO(a: {
  versao?: VersaoParaDownload | null;
  participacoes?: Participacao[];
  documento?: { faseId: string | null; restritoAoPapel: boolean; papelDirigido: Participacao["papel"] } | null;
  faseLiberada?: boolean;
  revogado?: boolean;
  integracao?: { integracaoId: string; driveId: string } | null;
  segredo?: SegredoMicrosoftGraph | null;
} = {}): IOArquivoBaixar {
  const autorizacaoCaso: IOAutorizacaoCaso = {
    participacoesDoUsuario: () => Promise.resolve(a.participacoes ?? [{ clienteId: CLIENTE_ID, papel: "aplicante" }]),
  };
  return {
    autorizacaoCaso,
    carregarVersao: () => Promise.resolve(a.versao === undefined ? VERSAO_BASE : a.versao),
    carregarDocumentoDestino: () =>
      Promise.resolve(
        a.documento === undefined
          ? { faseId: null, restritoAoPapel: false, papelDirigido: null }
          : a.documento,
      ),
    faseLiberada: () => Promise.resolve(a.faseLiberada ?? true),
    participanteRevogado: () => Promise.resolve(a.revogado ?? false),
    integracaoDoCliente: () =>
      Promise.resolve(a.integracao === undefined ? { integracaoId: "integracao-1", driveId: "drive-1" } : a.integracao),
    obterSegredoVault: () => Promise.resolve(a.segredo === undefined ? SEGREDO : a.segredo),
    salvarSegredoVault: () => Promise.resolve(),
  };
}

function montarGraph(corpo = new Uint8Array([1, 2, 3])): IOGraphMicrosoftTransferencia {
  return {
    trocarRefreshPorAccessToken: () => Promise.resolve({ accessToken: "access-1", refreshTokenNovo: null }),
    validarAncestralidade: () => Promise.resolve(true),
    buscarItemPorNome: () => Promise.resolve(null),
    criarSessaoUpload: () => Promise.resolve({ uploadUrl: "https://upload.example.com/nao-usado" }),
    enviarFragmento: () => Promise.resolve({ concluido: true, itemId: "x" }),
    baixarConteudo: () => Promise.resolve(corpo),
  };
}

function montarHandler(io: IOArquivoBaixar, graph: IOGraphMicrosoftTransferencia, a: { ehAdmin?: boolean } = {}) {
  return criarManipuladorArquivoBaixar({
    io,
    graph,
    autenticar: () => Promise.resolve({ userId: USER_ID, ehAdmin: a.ehAdmin ?? false }),
    limite: () => Promise.resolve({ permitido: true, reiniciaEm: null }),
  });
}

function req(versaoId = "versao-1") {
  return new Request(`https://fn.local/arquivo-baixar?versaoId=${versaoId}`, {
    method: "GET",
    headers: { Authorization: "Bearer token" },
  });
}

Deno.test("versão de outro caso (sem participação alguma) → 404, sem revelar existência", async () => {
  const handler = montarHandler(montarIO({ participacoes: [], revogado: false }), montarGraph());
  const resposta = await handler(req());
  assertEquals(resposta.status, 404);
});

Deno.test("versão restrita a outro papel → 404 (não 403 — 403 confirmaria existência)", async () => {
  const handler = montarHandler(
    montarIO({
      participacoes: [{ clienteId: CLIENTE_ID, papel: "beneficiario" }],
      documento: { faseId: null, restritoAoPapel: true, papelDirigido: "aplicante" },
    }),
    montarGraph(),
  );
  const resposta = await handler(req());
  assertEquals(resposta.status, 404);
});

Deno.test("participante revogado (sem participação ativa, mas com registro revogado) → 403", async () => {
  const handler = montarHandler(montarIO({ participacoes: [], revogado: true }), montarGraph());
  const resposta = await handler(req());
  assertEquals(resposta.status, 403);
});

Deno.test("participante sem restrição alguma → 200, documento livre", async () => {
  const handler = montarHandler(
    montarIO({ participacoes: [{ clienteId: CLIENTE_ID, papel: "beneficiario" }] }),
    montarGraph(),
  );
  const resposta = await handler(req());
  assertEquals(resposta.status, 200);
});

Deno.test("requisito restrito sem papel válido não permite download", async () => {
  const handler = montarHandler(
    montarIO({ documento: { faseId: null, restritoAoPapel: true, papelDirigido: null } }),
    montarGraph(),
  );
  assertEquals((await handler(req())).status, 404);
});

Deno.test("fase não liberada → 404", async () => {
  const handler = montarHandler(
    montarIO({ documento: { faseId: "fase-1", restritoAoPapel: false, papelDirigido: null }, faseLiberada: false }),
    montarGraph(),
  );
  const resposta = await handler(req());
  assertEquals(resposta.status, 404);
});

Deno.test("versão ligada a contrato (admin-only) nunca é alcançada por participante → 404", async () => {
  const handler = montarHandler(
    montarIO({ versao: { ...VERSAO_BASE, documentoId: null, contratoId: "contrato-1" } }),
    montarGraph(),
  );
  const resposta = await handler(req());
  assertEquals(resposta.status, 404);
});

Deno.test("admin baixa qualquer versão, mesmo sem participação", async () => {
  const handler = montarHandler(montarIO({ participacoes: [] }), montarGraph(), { ehAdmin: true });
  const resposta = await handler(req());
  assertEquals(resposta.status, 200);
});

Deno.test("resposta de sucesso: attachment com nome original, sem URL do Graph em header/corpo", async () => {
  const handler = montarHandler(montarIO(), montarGraph(new Uint8Array([37, 80, 68, 70])));
  const resposta = await handler(req());
  assertEquals(resposta.status, 200);
  assertEquals(resposta.headers.get("Content-Disposition"), 'attachment; filename="passaporte.pdf"');

  const corpoTexto = new TextDecoder().decode(new Uint8Array(await resposta.clone().arrayBuffer()));
  const headersTexto = [...resposta.headers.entries()].map(([k, v]) => `${k}:${v}`).join("\n");
  assert(!corpoTexto.includes("upload.example.com"));
  assert(!headersTexto.includes("upload.example.com"));
  assert(!headersTexto.toLowerCase().includes("graph.microsoft.com"));
});

Deno.test("versão ainda não armazenada → 409, nunca 404/expõe URL", async () => {
  const handler = montarHandler(montarIO({ versao: { ...VERSAO_BASE, estadoArmazenamento: "pendente", itemId: null } }), montarGraph());
  const resposta = await handler(req());
  assertEquals(resposta.status, 409);
});

Deno.test("sem versaoId → 422", async () => {
  const handler = montarHandler(montarIO(), montarGraph());
  const resposta = await handler(
    new Request("https://fn.local/arquivo-baixar", { method: "GET", headers: { Authorization: "Bearer token" } }),
  );
  assertEquals(resposta.status, 422);
});
