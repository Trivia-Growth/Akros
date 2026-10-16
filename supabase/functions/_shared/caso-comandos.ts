// _shared/caso-comandos.ts — lógica da Edge Function `caso-comandos` (E03-S07, T031b/T032):
// primeira Edge Function de comando transacional desta feature. Mesmo padrão porta/adapter de
// `playground.ts` (agente-playground): toda a decisão mora aqui, testável com um fake de
// `IOCasoComandos`; `caso-comandos/index.ts` só monta o adapter real (`requireAdmin`,
// `clienteServico().rpc()`, `criarIOIdempotencia()`) e chama `serve()`. Nenhum teste deste
// arquivo toca Postgres real — isso é feito manualmente contra `crm_test` (ver task-031-032-
// report.md), não pelo Deno test.
//
// Só `registrar_contrato` e `preparar_caso` nesta task (T031/T032). As outras seis ações da
// tabela de design-tecnico.md §2 (`convidar_participante`, `revogar_participante`,
// `solicitar_documento`, `vincular_pasta`, `registrar_nota`, `cadastrar_cobranca`) são de tasks
// futuras (T046/T056/T092) — o `switch` abaixo já está em forma de acomodar casos novos sem
// reescrever os dois já feitos.
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { HttpError } from "./auth.ts";
import { corsHeaders } from "./cors.ts";
import { requireCsrfHeader } from "./csrf.ts";
import { comIdempotencia, type IOIdempotencia } from "./idempotencia.ts";

const FN = "caso-comandos";
// Payload é só texto/número/UUID (sem upload) — teto generoso para a lista de condições do
// contrato, mesmo critério de tamanho máximo dos outros admin-only (`integracoes-ia-salvar`).
const MAX_BYTES = 16 * 1024;

const CondicaoSchema = z
  .object({
    descricao: z.string().min(1).max(200),
    tipo: z.enum(["entrada", "parcela", "taxa_federal", "outro"]),
    valor: z.number().positive(),
    moeda: z.enum(["BRL", "USD"]),
    vencimento: z.string().min(1), // ISO date — o CHECK de crm.contrato_condicoes valida de novo
    ordem: z.number().int(),
  })
  .strict();

export const RegistrarContratoSchema = z
  .object({
    acao: z.literal("registrar_contrato"),
    clienteId: z.string().uuid(),
    programaId: z.string().min(1),
    programaVersao: z.string().min(1),
    prazoRespostaDiasUteis: z.number().int().min(1).max(60),
    prioridade: z.enum(["padrao", "prioritaria"]).default("padrao"),
    observacao: z.string().max(2000).optional(),
    condicoes: z.array(CondicaoSchema).default([]),
    idempotencyKey: z.string().min(1),
  })
  .strict();

export const PrepararCasoSchema = z
  .object({
    acao: z.literal("preparar_caso"),
    clienteId: z.string().uuid(),
    contratoId: z.string().uuid(),
    levantamentoEstado: z.enum(["incompleto", "conferido"]).optional(),
    idempotencyKey: z.string().min(1),
  })
  .strict();

// União discriminada por `acao` — novas ações futuras (T046/T056/T092) entram como mais um
// elemento desta lista, sem tocar nos dois `case` já implementados no switch abaixo.
export const EntradaCasoComandos = z.discriminatedUnion("acao", [
  RegistrarContratoSchema,
  PrepararCasoSchema,
]);
export type EntradaCasoComandos = z.infer<typeof EntradaCasoComandos>;

/** Erro devolvido por `.rpc()` (shape do supabase-js: `{ code, message }`, `code` é o ERRCODE do
 *  Postgres quando a função usa `RAISE ... USING ERRCODE`). */
export interface ErroRpc {
  code?: string | null;
  message: string;
}

export interface RespostaRpc<T> {
  data: T | null;
  error: ErroRpc | null;
}

export interface IOCasoComandos {
  limite(req: Request): Promise<{ permitido: boolean; reiniciaEm: Date | null }>;
  /** Lança HttpError 401/403 se não for admin autenticado. Nunca lê userId do body — só da
   *  sessão validada (ver auth.ts `requireAdmin`). */
  autenticarAdmin(req: Request): Promise<{ userId: string }>;
  idempotencia: IOIdempotencia;
  rpc(
    nome: "registrar_contrato" | "preparar_caso",
    params: Record<string, unknown>,
  ): Promise<RespostaRpc<unknown>>;
}

function json(corpo: unknown, status: number, cors: Record<string, string>, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "Content-Type": "application/json", ...extra },
  });
}

/** Mapeia o ERRCODE da guarda de papel/validação SQL (ver migrations 0022/0023) para status
 *  HTTP — nunca vaza a mensagem de constraint/erro de banco ao cliente (RFC 7807 sanitizado). */
function erroDeNegocio(error: ErroRpc): HttpError {
  if (error.code === "42501") return new HttpError(403, "Operação não autorizada");
  if (error.code === "22023") return new HttpError(422, "Dados inválidos para esta operação");
  // unique_violation — ex.: dois admins registrando o primeiro contrato do mesmo cliente novo
  // ao mesmo tempo (crm_contratos_um_ativo_por_cliente, 0023). "Vínculo conflitante", categoria
  // 409 de design-tecnico.md §2 — não é 500 genérico, é um conflito real para o admin retentar.
  if (error.code === "23505") return new HttpError(409, "Conflito: já existe um registro equivalente");
  return new HttpError(500, "Não foi possível concluir agora");
}

/** Status de sucesso por ação: `registrar_contrato` cria um recurso novo (201); `preparar_caso`
 *  cria ou atualiza uma jornada existente, então 200 — mesmo valor em replay de idempotência. */
function statusDeSucesso(acao: EntradaCasoComandos["acao"]): number {
  return acao === "registrar_contrato" ? 201 : 200;
}

export function criarManipuladorCasoComandos(io: IOCasoComandos) {
  return async (req: Request): Promise<Response> => {
    const cors = corsHeaders(req.headers.get("Origin"));
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return new Response(null, { status: 405, headers: cors });

    // Fail-closed, antes de qualquer outra coisa (mesmo critério de lead-capturar/playground):
    // sem o limitador, um painel admin de escrita fica com teto efetivamente infinito.
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
      // Mesma posição de playground.ts: logo no início do try, antes de autenticar — mesmo
      // critério 2-por-2 já estabelecido no repositório para endpoint admin autenticado por
      // Bearer token (agente-playground, integracoes-ia-salvar), independente da sessão usar
      // cookie ou não.
      requireCsrfHeader(req);
      // Nunca confia em identidade vinda do body — userId sempre resolvido pela sessão.
      const { userId } = await io.autenticarAdmin(req);

      const bruto = await req.text();
      if (new TextEncoder().encode(bruto).byteLength > MAX_BYTES) {
        throw new HttpError(413, "Dados excedem limite");
      }

      let entrada: EntradaCasoComandos;
      try {
        entrada = EntradaCasoComandos.parse(JSON.parse(bruto));
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
            case "registrar_contrato": {
              const { data, error } = await io.rpc("registrar_contrato", {
                p_cliente_id: entrada.clienteId,
                p_programa_id: entrada.programaId,
                p_programa_versao: entrada.programaVersao,
                p_prazo_resposta_dias_uteis: entrada.prazoRespostaDiasUteis,
                p_prioridade: entrada.prioridade,
                p_observacao: entrada.observacao ?? null,
                p_condicoes: entrada.condicoes,
                p_autor_id: userId,
              });
              if (error) throw erroDeNegocio(error);
              return data;
            }
            case "preparar_caso": {
              const { data, error } = await io.rpc("preparar_caso", {
                p_cliente_id: entrada.clienteId,
                p_contrato_id: entrada.contratoId,
                p_levantamento_estado: entrada.levantamentoEstado ?? null,
                p_autor_id: userId,
              });
              if (error) throw erroDeNegocio(error);
              return data;
            }
            default: {
              // Exaustividade: união discriminada — novo literal de `acao` sem `case`
              // correspondente vira erro de compilação aqui, não comportamento silencioso.
              const _exaustivo: never = acao;
              throw new HttpError(500, "Ação não implementada");
            }
          }
        },
      );

      return json(resultado, statusDeSucesso(acao), cors);
    } catch (erro) {
      if (erro instanceof HttpError) return json({ erro: erro.message }, erro.status, cors);
      // Nada do erro original na resposta nem no log: pode carregar dado de cliente.
      console.warn(JSON.stringify({ ts: new Date().toISOString(), nivel: "warn", fn: FN, reqId, msg: "falha" }));
      return json({ erro: "Não foi possível concluir agora." }, 500, cors);
    }
  };
}
