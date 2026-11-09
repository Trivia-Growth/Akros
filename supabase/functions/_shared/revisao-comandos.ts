// _shared/revisao-comandos.ts — lógica da Edge Function `revisao-comandos` (E03-S07, Fase 6/US3):
// revisar_documento, decidir_etapa, liberar_fase (design-tecnico.md §2, migration 0042). Mesmo
// padrão porta/adapter de `caso-comandos.ts`: toda a decisão mora aqui, testável com um fake de
// `IORevisaoComandos`; `revisao-comandos/index.ts` só monta o adapter real e chama `serve()`.
// Admin-only (requireAdmin na Edge Function) — as RPCs não reverificam papel internamente.
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { HttpError } from "./auth.ts";
import { corsHeaders } from "./cors.ts";
import { requireCsrfHeader } from "./csrf.ts";
import { comIdempotencia, type IOIdempotencia } from "./idempotencia.ts";
import { lerTextoComLimite } from "./corpo.ts";

const FN = "revisao-comandos";
const MAX_BYTES = 16 * 1024;

export const RevisarDocumentoSchema = z
  .object({
    acao: z.literal("revisar_documento"),
    documentoId: z.string().uuid(),
    versaoId: z.string().uuid(),
    decisao: z.enum(["aprovado", "ajustes"]),
    justificativa: z.string().max(2000).optional(),
    revisaoEsperada: z.number().int(),
    idempotencyKey: z.string().min(1),
  })
  .strict();

export const DecidirEtapaSchema = z
  .object({
    acao: z.literal("decidir_etapa"),
    etapaId: z.string().uuid(),
    decisao: z.enum(["concluida", "pendente"]),
    motivo: z.string().max(2000).optional(),
    revisaoEsperada: z.number().int(),
    idempotencyKey: z.string().min(1),
  })
  .strict();

export const LiberarFaseSchema = z
  .object({
    acao: z.literal("liberar_fase"),
    faseId: z.string().uuid(),
    revisaoEsperada: z.number().int(),
    idempotencyKey: z.string().min(1),
  })
  .strict();

export const ConciliarPagamentoSchema = z
  .object({
    acao: z.literal("conciliar_pagamento"),
    pagamentoId: z.string().uuid(),
    decisao: z.enum(["pago", "divergente"]),
    valorRecebido: z.number().positive(),
    motivoDivergencia: z.string().max(2000).optional(),
    revisaoEsperada: z.number().int(),
    idempotencyKey: z.string().min(1),
  })
  .strict();

const UniaoRevisaoComandos = z.discriminatedUnion("acao", [
  RevisarDocumentoSchema,
  DecidirEtapaSchema,
  LiberarFaseSchema,
  ConciliarPagamentoSchema,
]);

// Mesma regra espelhada duas vezes (Zod aqui + CHECK do banco) que `caso-comandos.ts` usa para
// `sujeitoTipo` — responder 422 com mensagem clara antes do INSERT/UPDATE, em vez de deixar só o
// CHECK (`23514`) pegar depois.
export const EntradaRevisaoComandos = UniaoRevisaoComandos.superRefine((entrada, ctx) => {
  if (entrada.acao === "revisar_documento" && entrada.decisao === "ajustes") {
    if (!entrada.justificativa || entrada.justificativa.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "justificativa obrigatória para devolver com ajustes",
        path: ["justificativa"],
      });
    }
  }
  if (entrada.acao === "decidir_etapa" && entrada.decisao === "pendente") {
    if (!entrada.motivo || entrada.motivo.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "motivo obrigatório para devolver a etapa",
        path: ["motivo"],
      });
    }
  }
  if (entrada.acao === "conciliar_pagamento" && entrada.decisao === "divergente") {
    if (!entrada.motivoDivergencia || entrada.motivoDivergencia.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "motivo obrigatório para registrar divergência",
        path: ["motivoDivergencia"],
      });
    }
  }
});
export type EntradaRevisaoComandos = z.infer<typeof EntradaRevisaoComandos>;

export interface ErroRpc {
  code?: string | null;
  message: string;
}
export interface RespostaRpc<T> {
  data: T | null;
  error: ErroRpc | null;
}

export interface IORevisaoComandos {
  limite(req: Request): Promise<{ permitido: boolean; reiniciaEm: Date | null }>;
  autenticarAdmin(req: Request): Promise<{ userId: string }>;
  idempotencia: IOIdempotencia;
  rpc(
    nome: "revisar_documento" | "decidir_etapa" | "liberar_fase" | "conciliar_pagamento",
    params: Record<string, unknown>,
  ): Promise<RespostaRpc<unknown>>;
}

function json(corpo: unknown, status: number, cors: Record<string, string>, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "Content-Type": "application/json", ...extra },
  });
}

/** Mapeia o ERRCODE das RPCs de 0042 para status HTTP — nunca vaza mensagem de erro de banco. */
function erroDeNegocio(error: ErroRpc): HttpError {
  if (error.code === "42501") return new HttpError(403, "Operação não autorizada");
  if (error.code === "22023") return new HttpError(422, "Dados inválidos para esta operação");
  if (error.code === "23514") return new HttpError(422, "Dados inválidos para esta operação");
  if (error.code === "P0002") return new HttpError(404, "Recurso não encontrado");
  if (error.code === "55000") return new HttpError(409, "Estado incompatível com a operação");
  if (error.code === "40001") return new HttpError(409, "Conflito: dado foi alterado por outra ação");
  if (error.code === "23505") return new HttpError(409, "Conflito: já existe um registro equivalente");
  return new HttpError(500, "Não foi possível concluir agora");
}

export function criarManipuladorRevisaoComandos(io: IORevisaoComandos) {
  return async (req: Request): Promise<Response> => {
    const cors = corsHeaders(req.headers.get("Origin"));
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return new Response(null, { status: 405, headers: cors });

    const limite = await io.limite(req);
    if (!limite.permitido) {
      const segundos = limite.reiniciaEm
        ? Math.max(1, Math.ceil((limite.reiniciaEm.getTime() - Date.now()) / 1000))
        : 60;
      return json({ erro: "Muitas requisições. Tente de novo em instantes." }, 429, cors, {
        "Retry-After": String(segundos),
      });
    }

    const reqId = crypto.randomUUID().slice(0, 8);
    try {
      requireCsrfHeader(req);
      const { userId } = await io.autenticarAdmin(req);

      const bruto = await lerTextoComLimite(req, MAX_BYTES);
      if (bruto === null) throw new HttpError(413, "Dados excedem limite");

      let entrada: EntradaRevisaoComandos;
      try {
        entrada = EntradaRevisaoComandos.parse(JSON.parse(bruto));
      } catch {
        throw new HttpError(422, "Dados inválidos");
      }

      const { acao, idempotencyKey, ...conteudo } = entrada;

      const resultado = await comIdempotencia(
        io.idempotencia,
        acao,
        idempotencyKey,
        conteudo,
        userId,
        async () => {
          switch (acao) {
            case "revisar_documento": {
              const { data, error } = await io.rpc("revisar_documento", {
                p_documento_id: entrada.documentoId,
                p_versao_id: entrada.versaoId,
                p_decisao: entrada.decisao,
                p_justificativa: entrada.justificativa ?? null,
                p_revisao_esperada: entrada.revisaoEsperada,
                p_autor_id: userId,
              });
              if (error) throw erroDeNegocio(error);
              return data;
            }
            case "decidir_etapa": {
              const { data, error } = await io.rpc("decidir_etapa", {
                p_etapa_id: entrada.etapaId,
                p_decisao: entrada.decisao,
                p_motivo: entrada.motivo ?? null,
                p_revisao_esperada: entrada.revisaoEsperada,
                p_autor_id: userId,
              });
              if (error) throw erroDeNegocio(error);
              return data;
            }
            case "liberar_fase": {
              const { data, error } = await io.rpc("liberar_fase", {
                p_fase_id: entrada.faseId,
                p_revisao_esperada: entrada.revisaoEsperada,
                p_autor_id: userId,
              });
              if (error) throw erroDeNegocio(error);
              return data;
            }
            case "conciliar_pagamento": {
              const { data, error } = await io.rpc("conciliar_pagamento", {
                p_pagamento_id: entrada.pagamentoId,
                p_decisao: entrada.decisao,
                p_valor_recebido: entrada.valorRecebido,
                p_motivo_divergencia: entrada.motivoDivergencia ?? null,
                p_revisao_esperada: entrada.revisaoEsperada,
                p_autor_id: userId,
              });
              if (error) throw erroDeNegocio(error);
              return data;
            }
            default: {
              const _exaustivo: never = acao;
              throw new HttpError(500, "Ação não implementada");
            }
          }
        },
      );

      return json(resultado, 200, cors);
    } catch (erro) {
      if (erro instanceof HttpError) return json({ erro: erro.message }, erro.status, cors);
      console.warn(JSON.stringify({ ts: new Date().toISOString(), nivel: "warn", fn: FN, reqId, msg: "falha" }));
      return json({ erro: "Não foi possível concluir agora." }, 500, cors);
    }
  };
}
