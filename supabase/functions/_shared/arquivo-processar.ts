// _shared/arquivo-processar.ts — lógica da Edge Function `arquivo-processar` (E03-S07, Fase 5/
// US2, ADR-0019, T069-T071). Mesmo padrão porta/adapter de `caso-comandos.ts`/`playground.ts`:
// toda a decisão mora aqui, testável com fakes de `IOArquivoProcessar`/`IOGraphMicrosoft`;
// `arquivo-processar/index.ts` só monta os adapters reais (`requireServiceRole`,
// `clienteServico()`, `criarIOGraphMicrosoft()`) e chama `serve()`.
//
// Contrato exato (design-tecnico.md §2.2, 8 passos) — NÃO invente substituto:
//   1) FOR UPDATE SKIP LOCKED + lease de 5 min (via RPC `arquivos.adquirir_trabalho_pendente`,
//      chamada por `IOArquivoProcessar.adquirirTrabalho`).
//   2) Token: refresh do Vault → troca por access token.
//   3) Valida ancestralidade da pasta — SEMPRE, não só na vinculação.
//   4) Cria sessão de upload, guarda só a REFERÊNCIA do segredo no banco.
//   5) Fragmentos de 5 MiB, checkpoint em `bytes_enviados`.
//   6) Conclui: `item_id` + `armazenado`, trabalho `concluido`, descarta segredo da sessão.
//   7) Resposta perdida: reconcilia pelo nome determinístico ANTES de reenviar.
//   8) Falha: backoff `min(2^tentativas min, 60 min)` respeitando `Retry-After`; 401/403/quota/
//      pasta ausente bloqueiam com motivo legível; qualquer outra falha é transitória (tenta de
//      novo, nunca bloqueia, nunca marca `armazenado` sem confirmação).
import { corsHeaders } from "./cors.ts";
import { HttpError } from "./auth.ts";
import { BACKOFF_MAXIMO_MINUTOS, FRAGMENTO_TRANSFERENCIA_BYTES } from "./limites.ts";
import { GraphError, type IOGraphMicrosoft, type SegredoMicrosoftGraph } from "./graph-microsoft.ts";

export const MOTIVO_RECONECTAR = "reconectar conta Microsoft";
export const MOTIVO_QUOTA = "quota do OneDrive excedida";
export const MOTIVO_PASTA_AUSENTE = "pasta do caso não encontrada";

export interface TrabalhoLease {
  trabalhoId: string;
  versaoId: string;
  tentativas: number;
}

export interface ContextoTransferencia {
  versaoId: string;
  clienteId: string;
  documentoId: string | null;
  pagamentoId: string | null;
  tamanhoBytes: number;
  objetoTemporario: string;
  integracaoId: string;
  driveId: string;
  folderItemId: string;
  pastaRaizItemId: string;
}

export type ResultadoContexto =
  | { ok: true; contexto: ContextoTransferencia }
  // `motivo` já é a mensagem SANITIZADA final (ex.: MOTIVO_PASTA_AUSENTE) — carregar o contexto
  // falha só por "vínculo/integração ausente ou inconsistente", sempre mapeável a um dos motivos
  // fixos de T071, nunca a um detalhe técnico.
  | { ok: false; motivo: string };

/** Porta de E/S do processador contra Postgres/Storage (`service_role`). Nenhum teste deste
 *  arquivo toca Postgres real — isso é feito manualmente contra `crm_test` (ver relatório desta
 *  task), não pelo Deno test. */
export interface IOArquivoProcessar {
  /** `SELECT ... FOR UPDATE SKIP LOCKED` + grava lease, via RPC `arquivos.
   *  adquirir_trabalho_pendente` (supabase-js não expõe FOR UPDATE SKIP LOCKED em
   *  `.from().select()`). `null` se não há trabalho pendente elegível agora. */
  adquirirTrabalho(leaseDono: string): Promise<TrabalhoLease | null>;
  carregarContexto(trabalho: TrabalhoLease): Promise<ResultadoContexto>;
  obterSegredoVault(escopo: string): Promise<SegredoMicrosoftGraph | null>;
  salvarSegredoVault(escopo: string, valor: Record<string, string>): Promise<void>;
  /** Melhor esforço — nunca deve impedir o sucesso já gravado (T069 passo 6, "descarta o
   *  segredo da sessão"). */
  descartarSegredoSessao(versaoId: string): Promise<void>;
  baixarObjetoTemporario(caminho: string): Promise<Uint8Array>;
  atualizarProgresso(trabalhoId: string, bytesEnviados: number, sessaoReferencia: string | null): Promise<void>;
  marcarConcluido(args: { trabalhoId: string; versaoId: string; itemId: string; driveId: string }): Promise<void>;
  marcarFalhaTransitoria(args: { trabalhoId: string; tentativas: number; proximaTentativaEm: Date }): Promise<void>;
  marcarBloqueado(args: { trabalhoId: string; motivo: string }): Promise<void>;
}

export interface ResultadoProcessamento {
  processado: boolean;
  resultado?: "concluido" | "reconciliado" | "falha_transitoria" | "bloqueado";
  motivo?: string;
}

/** `<requisito|cobranca>-<versaoId>.pdf` (T069 passo 6 / T070) — nunca ambos, por
 *  `versao_destino_unico` (migration 0020). Versão ligada a `contrato_id` não passa por aqui:
 *  o fluxo de envio do participante (`reservar_envio`/`finalizar_envio`, §2.1) só cria trabalho
 *  de transferência para versão de `documento_id`/`pagamento_id`. */
function nomeDeterministico(contexto: ContextoTransferencia): string {
  if (contexto.documentoId) return `requisito-${contexto.versaoId}.pdf`;
  if (contexto.pagamentoId) return `cobranca-${contexto.versaoId}.pdf`;
  throw new Error("versão sem destino de negócio reconhecido para nome determinístico");
}

async function registrarFalhaTransitoria(
  io: IOArquivoProcessar,
  trabalho: TrabalhoLease,
  agora: () => Date,
  retryAfterSegundos: number | null,
): Promise<ResultadoProcessamento> {
  const tentativas = trabalho.tentativas + 1;
  const backoffMinutos = Math.min(2 ** tentativas, BACKOFF_MAXIMO_MINUTOS);
  const base = agora();
  const porBackoff = new Date(base.getTime() + backoffMinutos * 60_000);
  const porRetryAfter =
    retryAfterSegundos != null ? new Date(base.getTime() + retryAfterSegundos * 1000) : null;
  // "usa o maior dos dois" (T070) — nunca tenta de novo antes do que o Graph pediu.
  const proximaTentativaEm = porRetryAfter && porRetryAfter > porBackoff ? porRetryAfter : porBackoff;
  await io.marcarFalhaTransitoria({ trabalhoId: trabalho.trabalhoId, tentativas, proximaTentativaEm });
  return { processado: true, resultado: "falha_transitoria" };
}

async function tratarFalha(
  io: IOArquivoProcessar,
  trabalho: TrabalhoLease,
  erro: unknown,
  agora: () => Date,
): Promise<ResultadoProcessamento> {
  if (erro instanceof GraphError) {
    if (erro.tipo === "auth") {
      await io.marcarBloqueado({ trabalhoId: trabalho.trabalhoId, motivo: MOTIVO_RECONECTAR });
      return { processado: true, resultado: "bloqueado", motivo: MOTIVO_RECONECTAR };
    }
    if (erro.tipo === "quota") {
      await io.marcarBloqueado({ trabalhoId: trabalho.trabalhoId, motivo: MOTIVO_QUOTA });
      return { processado: true, resultado: "bloqueado", motivo: MOTIVO_QUOTA };
    }
    if (erro.tipo === "pasta_ausente") {
      await io.marcarBloqueado({ trabalhoId: trabalho.trabalhoId, motivo: MOTIVO_PASTA_AUSENTE });
      return { processado: true, resultado: "bloqueado", motivo: MOTIVO_PASTA_AUSENTE };
    }
    // tipo "rede": indisponibilidade transitória da Microsoft — versão permanece `recebida`,
    // trabalho permanece `pendente` (T072). Nunca bloqueia.
    return registrarFalhaTransitoria(io, trabalho, agora, erro.retryAfterSegundos);
  }
  return registrarFalhaTransitoria(io, trabalho, agora, null);
}

export interface DepsProcessamento {
  io: IOArquivoProcessar;
  graph: IOGraphMicrosoft;
  /** Injetável para teste de backoff determinístico; produção usa `Date` real. */
  agora?: () => Date;
}

/** Processa UM trabalho pendente (uma invocação = uma tentativa de lease). Sem trabalho elegível,
 *  devolve `{ processado: false }` sem erro — isto é estado normal (fila vazia), não falha. */
export async function processarUmTrabalho({
  io,
  graph,
  agora = () => new Date(),
}: DepsProcessamento): Promise<ResultadoProcessamento> {
  const leaseDono = crypto.randomUUID();
  const trabalho = await io.adquirirTrabalho(leaseDono);
  if (!trabalho) return { processado: false };

  try {
    const ctx = await io.carregarContexto(trabalho);
    if (!ctx.ok) {
      await io.marcarBloqueado({ trabalhoId: trabalho.trabalhoId, motivo: ctx.motivo });
      return { processado: true, resultado: "bloqueado", motivo: ctx.motivo };
    }
    const contexto = ctx.contexto;
    const nomeArquivo = nomeDeterministico(contexto);
    const escopoGraph = `microsoft-graph:${contexto.integracaoId}`;
    const escopoSessao = `upload-sessao:${contexto.versaoId}`;

    const segredoGraph = await io.obterSegredoVault(escopoGraph);
    if (!segredoGraph) {
      await io.marcarBloqueado({ trabalhoId: trabalho.trabalhoId, motivo: MOTIVO_RECONECTAR });
      return { processado: true, resultado: "bloqueado", motivo: MOTIVO_RECONECTAR };
    }

    const { accessToken, refreshTokenNovo } = await graph.trocarRefreshPorAccessToken(segredoGraph);
    if (refreshTokenNovo) {
      await io.salvarSegredoVault(escopoGraph, { ...segredoGraph, refreshToken: refreshTokenNovo });
    }

    // Passo 3 — SEMPRE, não só na vinculação original.
    const ancestral = await graph.validarAncestralidade({
      accessToken,
      driveId: contexto.driveId,
      itemId: contexto.folderItemId,
      ancestralEsperadoId: contexto.pastaRaizItemId,
    });
    if (!ancestral) {
      await io.marcarBloqueado({ trabalhoId: trabalho.trabalhoId, motivo: MOTIVO_PASTA_AUSENTE });
      return { processado: true, resultado: "bloqueado", motivo: MOTIVO_PASTA_AUSENTE };
    }

    // Passo 7 (T070) — reconciliação ANTES de qualquer envio/criação de sessão nova.
    const existente = await graph.buscarItemPorNome({
      accessToken,
      driveId: contexto.driveId,
      folderItemId: contexto.folderItemId,
      nomeArquivo,
    });
    if (existente && existente.tamanhoBytes === contexto.tamanhoBytes) {
      await io.marcarConcluido({
        trabalhoId: trabalho.trabalhoId,
        versaoId: contexto.versaoId,
        itemId: existente.itemId,
        driveId: contexto.driveId,
      });
      return { processado: true, resultado: "reconciliado" };
    }

    // Passo 4 — sessão nova + só a referência no banco.
    const sessao = await graph.criarSessaoUpload({
      accessToken,
      driveId: contexto.driveId,
      folderItemId: contexto.folderItemId,
      nomeArquivo,
    });
    await io.salvarSegredoVault(escopoSessao, { uploadUrl: sessao.uploadUrl });
    await io.atualizarProgresso(trabalho.trabalhoId, 0, escopoSessao);

    const bytes = await io.baixarObjetoTemporario(contexto.objetoTemporario);
    if (bytes.byteLength !== contexto.tamanhoBytes) {
      throw new Error("tamanho do objeto temporário diverge do declarado em arquivos.versoes");
    }

    // Passo 5 — fragmentos de 5 MiB, checkpoint a cada um.
    let enviados = 0;
    let itemIdFinal: string | null = null;
    while (enviados < bytes.byteLength) {
      const fim = Math.min(enviados + FRAGMENTO_TRANSFERENCIA_BYTES, bytes.byteLength);
      const fragmento = bytes.subarray(enviados, fim);
      const r = await graph.enviarFragmento({
        uploadUrl: sessao.uploadUrl,
        bytes: fragmento,
        inicio: enviados,
        fim: fim - 1,
        total: bytes.byteLength,
      });
      enviados = fim;
      await io.atualizarProgresso(trabalho.trabalhoId, enviados, escopoSessao);
      if (r.concluido) {
        itemIdFinal = r.itemId;
        break;
      }
    }
    if (!itemIdFinal) throw new Error("upload terminou sem confirmação de item pelo Graph");

    // Passo 6 — conclui. NUNCA marca `armazenado` sem item_id confirmado (T071) — itemIdFinal só
    // existe aqui porque veio da reconciliação (acima) ou da confirmação explícita do Graph.
    await io.marcarConcluido({
      trabalhoId: trabalho.trabalhoId,
      versaoId: contexto.versaoId,
      itemId: itemIdFinal,
      driveId: contexto.driveId,
    });
    await io.descartarSegredoSessao(contexto.versaoId);
    return { processado: true, resultado: "concluido" };
  } catch (erro) {
    return tratarFalha(io, trabalho, erro, agora);
  }
}

function json(corpo: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function problem(status: number, detail: string, reqId: string, cors: Record<string, string>) {
  const titles: Record<number, string> = { 401: "Unauthorized", 429: "Too Many Requests", 500: "Internal Server Error" };
  return new Response(
    JSON.stringify({ type: "about:blank", title: titles[status] ?? "Error", status, detail, reqId }),
    { status, headers: { ...cors, "Content-Type": "application/problem+json" } },
  );
}

export interface DepsHandlerArquivoProcessar extends DepsProcessamento {
  /** Nunca aceita `clienteId`/`driveId`/URL de chamador público — só o segredo de serviço no
   *  header (`requireServiceRole`). Lança `HttpError(401, ...)` se inválido. */
  autenticarServico: (req: Request) => void;
  limite: (req: Request) => Promise<{ permitido: boolean; reiniciaEm: Date | null }>;
}

export function criarManipuladorArquivoProcessar(deps: DepsHandlerArquivoProcessar) {
  return async (req: Request): Promise<Response> => {
    const cors = corsHeaders(req.headers.get("Origin"));
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const reqId = crypto.randomUUID().slice(0, 8);
    try {
      // Autenticação ANTES do rate limit: função interna, sem segredo válido nem chega a
      // consumir cota (mesmo critério de endpoints internos existentes).
      deps.autenticarServico(req);

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

      const resultado = await processarUmTrabalho({ io: deps.io, graph: deps.graph, agora: deps.agora });
      return json(resultado, 200, cors);
    } catch (e) {
      if (e instanceof HttpError) return problem(e.status, e.message, reqId, cors);
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          nivel: "error",
          fn: "arquivo-processar",
          reqId,
          msg: "erro inesperado",
        }),
      );
      return problem(500, "Erro interno", reqId, cors);
    }
  };
}
