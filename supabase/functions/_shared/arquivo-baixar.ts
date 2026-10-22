// _shared/arquivo-baixar.ts — lógica da Edge Function `arquivo-baixar` (E03-S07, Fase 5/US2,
// T073-T074, ADR-0019 ponto 6). Mesmo padrão porta/adapter das demais: toda a decisão mora aqui,
// testável com fakes; `arquivo-baixar/index.ts` só monta os adapters reais.
//
// Autorização: reusa `exigirPapel`/`resolverParticipacao` (_shared/autorizacao-caso.ts) — o papel
// exigido é o `papel_dirigido` do documento dono da versão, ou qualquer participante se
// `restrito_ao_papel = false`. MESMO predicado da policy `participante_ve_versao_do_caso_no_seu_
// papel` (migration 0020) — não reimplementado diferente da SQL:
//   d.restrito_ao_papel = false OR d.papel_dirigido IS NULL OR crm.tenho_papel(d.cliente_id, d.papel_dirigido)
// Erros (design-tecnico.md §2, regras transversais): 401 sessão; **404** para versão de outro
// caso E para versão restrita a outro papel (403 confirmaria existência); 403 só para
// participante com registro REVOGADO nesse caso (ele sabe que foi revogado — não é informação
// nova, ao contrário de "existe um requisito restrito aqui").
import { corsHeaders } from "./cors.ts";
import { HttpError, forbidden } from "./auth.ts";
import { exigirPapel, resolverParticipacao, type IOAutorizacaoCaso } from "./autorizacao-caso.ts";
import type { IOGraphMicrosoftTransferencia, SegredoMicrosoftGraph } from "./graph-microsoft.ts";

export interface VersaoParaDownload {
  id: string;
  clienteId: string;
  documentoId: string | null;
  pagamentoId: string | null;
  contratoId: string | null;
  nomeOriginal: string;
  driveId: string | null;
  itemId: string | null;
  estadoArmazenamento: string;
}

export interface DocumentoDestino {
  faseId: string | null;
  restritoAoPapel: boolean;
  papelDirigido: "aplicante" | "beneficiario" | "organizacao_aplicante" | "familiar_apoio" | null;
}

export interface IOArquivoBaixar {
  autorizacaoCaso: IOAutorizacaoCaso;
  carregarVersao(versaoId: string): Promise<VersaoParaDownload | null>;
  carregarDocumentoDestino(documentoId: string): Promise<DocumentoDestino | null>;
  faseLiberada(faseId: string): Promise<boolean>;
  /** `true` só se existe uma linha de `crm.participantes` para (authUserId, clienteId) com
   *  `estado = 'revogado'` — distingue "foi revogado" (403) de "nunca participou" (404). */
  participanteRevogado(authUserId: string, clienteId: string): Promise<boolean>;
  integracaoDoCliente(clienteId: string): Promise<{ integracaoId: string; driveId: string } | null>;
  obterSegredoVault(escopo: string): Promise<SegredoMicrosoftGraph | null>;
  salvarSegredoVault(escopo: string, valor: Record<string, string>): Promise<void>;
}

const NAO_ENCONTRADO = "Arquivo não encontrado";

async function autorizarDownload(
  io: IOArquivoBaixar,
  authUserId: string,
  versao: VersaoParaDownload,
): Promise<void> {
  // contrato_id: destino admin-only (crm.contratos) — nenhum ramo de participante alcança isto,
  // mesmo critério da policy "participante_ve_versao_do_caso_no_seu_papel" (0020), que só cobre
  // documento_id/pagamento_id.
  if (versao.contratoId) throw new HttpError(404, NAO_ENCONTRADO);

  if (versao.pagamentoId) {
    const participacoes = await resolverParticipacao(io.autorizacaoCaso, authUserId, {
      clienteId: versao.clienteId,
    });
    if (participacoes.length === 0) {
      const revogado = await io.participanteRevogado(authUserId, versao.clienteId);
      throw revogado ? forbidden("Participação revogada") : new HttpError(404, NAO_ENCONTRADO);
    }
    return; // qualquer participante ativo do caso vê a versão ligada a pagamento.
  }

  if (!versao.documentoId) throw new HttpError(404, NAO_ENCONTRADO);
  const documento = await io.carregarDocumentoDestino(versao.documentoId);
  if (!documento) throw new HttpError(404, NAO_ENCONTRADO);

  if (documento.faseId) {
    const liberada = await io.faseLiberada(documento.faseId);
    if (!liberada) throw new HttpError(404, NAO_ENCONTRADO);
  }

  const participacoes = await resolverParticipacao(io.autorizacaoCaso, authUserId, {
    clienteId: versao.clienteId,
  });
  if (participacoes.length === 0) {
    const revogado = await io.participanteRevogado(authUserId, versao.clienteId);
    throw revogado ? forbidden("Participação revogada") : new HttpError(404, NAO_ENCONTRADO);
  }

  if (documento.restritoAoPapel && documento.papelDirigido) {
    const temPapel = participacoes.some((p) => p.papel === documento.papelDirigido);
    // Participa do caso (ramo acima garantiu isso) mas sem o papel exigido: 404, nunca 403 —
    // "403 confirmaria existência" do requisito restrito (design-tecnico.md §2). `exigirPapel`
    // não é chamado aqui de propósito: ele lançaria 403 neste caso, que é o comportamento
    // CERTO para ação (convidar/revogar), mas ERRADO para leitura de requisito restrito.
    if (!temPapel) throw new HttpError(404, NAO_ENCONTRADO);
  }
}

export interface DepsHandlerArquivoBaixar {
  io: IOArquivoBaixar;
  graph: IOGraphMicrosoftTransferencia;
  autenticar: (req: Request) => Promise<{ userId: string; ehAdmin: boolean }>;
  limite: (req: Request) => Promise<{ permitido: boolean; reiniciaEm: Date | null }>;
}

function problem(status: number, detail: string, reqId: string, cors: Record<string, string>) {
  const titles: Record<number, string> = {
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
  };
  return new Response(
    JSON.stringify({ type: "about:blank", title: titles[status] ?? "Error", status, detail, reqId }),
    { status, headers: { ...cors, "Content-Type": "application/problem+json" } },
  );
}

export function criarManipuladorArquivoBaixar(deps: DepsHandlerArquivoBaixar) {
  return async (req: Request): Promise<Response> => {
    const cors = corsHeaders(req.headers.get("Origin"));
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "GET") return new Response(null, { status: 405, headers: cors });

    const reqId = crypto.randomUUID().slice(0, 8);
    try {
      // Fail-closed, antes de qualquer outra coisa (mesmo critério de caso-comandos/playground).
      const limite = await deps.limite(req);
      if (!limite.permitido) {
        const segundos = limite.reiniciaEm
          ? Math.max(1, Math.ceil((limite.reiniciaEm.getTime() - Date.now()) / 1000))
          : 60;
        return new Response(JSON.stringify({ erro: "Muitas requisições. Tente de novo em instantes." }), {
          status: 429,
          headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(segundos) },
        });
      }

      const { userId, ehAdmin } = await deps.autenticar(req);

      const versaoId = new URL(req.url).searchParams.get("versaoId");
      if (!versaoId) throw new HttpError(422, "versaoId obrigatório");

      const versao = await deps.io.carregarVersao(versaoId);
      if (!versao) throw new HttpError(404, NAO_ENCONTRADO);

      if (!ehAdmin) {
        await autorizarDownload(deps.io, userId, versao);
      }

      if (versao.estadoArmazenamento !== "armazenado" || !versao.itemId || !versao.driveId) {
        // Autorizado a ver o requisito, mas o binário ainda não está no OneDrive — não é
        // "não encontrado" (o participante já sabe que enviou), é "ainda não pronto".
        throw new HttpError(409, "Arquivo ainda em transferência, tente novamente em instantes");
      }

      const integracao = await deps.io.integracaoDoCliente(versao.clienteId);
      if (!integracao) throw new HttpError(409, "Integração Microsoft do caso não encontrada");

      const segredo = await deps.io.obterSegredoVault(`microsoft-graph:${integracao.integracaoId}`);
      if (!segredo) throw new HttpError(409, "Conexão Microsoft indisponível, tente novamente em instantes");

      const { accessToken, refreshTokenNovo } = await deps.graph.trocarRefreshPorAccessToken(segredo);
      if (refreshTokenNovo) {
        await deps.io.salvarSegredoVault(`microsoft-graph:${integracao.integracaoId}`, {
          ...segredo,
          refreshToken: refreshTokenNovo,
        });
      }

      // Server baixa do Graph e faz stream/proxy do binário — a URL pré-autenticada do Graph
      // nunca chega a este ponto como string visível (fica dentro de `baixarConteudo`,
      // ver `_shared/graph-microsoft.ts`), nunca é persistida nem devolvida ao cliente.
      const corpo = await deps.graph.baixarConteudo({
        accessToken,
        driveId: versao.driveId,
        itemId: versao.itemId,
      });

      return new Response(corpo as BodyInit, {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${versao.nomeOriginal.replaceAll('"', "")}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (e) {
      if (e instanceof HttpError) return problem(e.status, e.message, reqId, cors);
      console.error(
        JSON.stringify({ ts: new Date().toISOString(), nivel: "error", fn: "arquivo-baixar", reqId, msg: "erro inesperado" }),
      );
      return problem(500, "Erro interno", reqId, cors);
    }
  };
}

