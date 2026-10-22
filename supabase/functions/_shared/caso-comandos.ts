// _shared/caso-comandos.ts — lógica da Edge Function `caso-comandos` (E03-S07, T031b/T032):
// primeira Edge Function de comando transacional desta feature. Mesmo padrão porta/adapter de
// `playground.ts` (agente-playground): toda a decisão mora aqui, testável com um fake de
// `IOCasoComandos`; `caso-comandos/index.ts` só monta o adapter real (`requireAdmin`,
// `clienteServico().rpc()`, `criarIOIdempotencia()`) e chama `serve()`. Nenhum teste deste
// arquivo toca Postgres real — isso é feito manualmente contra `crm_test` (ver task-031-032-
// report.md), não pelo Deno test.
//
// `registrar_contrato`/`preparar_caso` (T031/T032), `convidar_participante`/
// `revogar_participante`/`solicitar_documento` (T046-T048, US6, ADR-0018, migration 0024) e, a
// partir desta task, `vincular_pasta` (T056, Fase 5, ADR-0019, migration 0026). As duas ações
// restantes da tabela de design-tecnico.md §2 (`registrar_nota`, `cadastrar_cobranca`) são de
// task futura (T092) — o `switch` abaixo já está em forma de acomodar casos novos sem reescrever
// os já feitos.
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { HttpError } from "./auth.ts";
import { corsHeaders } from "./cors.ts";
import { requireCsrfHeader } from "./csrf.ts";
import type { IOGraphMicrosoftOAuth } from "./graph-microsoft.ts";
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

// Espelha `PapelParticipante` (apps/web/src/shared/contracts/caso.ts) — declarado inline porque
// esta é uma função Deno (Edge Function), não importa de `apps/web`. Mudar este conjunto exige
// mudar os dois lugares (nenhum import cruzado entre os dois runtimes).
const PapelParticipanteSchema = z.enum([
  "aplicante",
  "beneficiario",
  "organizacao_aplicante",
  "familiar_apoio",
]);

export const ConvidarParticipanteSchema = z
  .object({
    acao: z.literal("convidar_participante"),
    clienteId: z.string().uuid(),
    papel: PapelParticipanteSchema,
    // Espelha `crm.participantes.sujeito_tipo` (migration 0017) — conjunto distinto do
    // `SujeitoDocumento` usado em `solicitarDocumento` (abaixo), que espelha
    // `documentos.documentos.sujeito_tipo` (0019): são colunas de tabelas diferentes, com
    // valores permitidos diferentes ("organizacao" aqui, "caso" lá).
    sujeitoTipo: z.enum(["titular", "familiar", "organizacao"]),
    familiarId: z.string().min(1).optional(),
    organizacaoId: z.string().uuid().optional(),
    nomeExibicao: z.string().min(1).max(200),
    email: z.string().email().optional(),
    idempotencyKey: z.string().min(1),
  })
  .strict();

export const RevogarParticipanteSchema = z
  .object({
    acao: z.literal("revogar_participante"),
    participanteId: z.string().uuid(),
    idempotencyKey: z.string().min(1),
  })
  .strict();

export const SolicitarDocumentoSchema = z
  .object({
    acao: z.literal("solicitar_documento"),
    clienteId: z.string().uuid(),
    faseId: z.string().uuid(),
    // `id` do requisito no catálogo (`RequisitoDocumento.id`, programas/domain/types.ts) — NÃO
    // `tipo`. Correção em 2026-10-16 (revisão adversarial): um programa pode ter dois
    // requisitos do mesmo `tipo` com marcas de restrição diferentes (ex.: visto R —
    // "passaporte" genérico e "passaporte" da organização, restrito); `tipo` não identifica o
    // requisito de forma única, `id` sim (ver migration 0024, `crm.solicitar_documento`).
    requisitoId: z.string().min(1),
    // Espelha `SujeitoDocumento` (apps/web/src/shared/contracts/caso.ts) /
    // `documentos.documentos.sujeito_tipo` (migration 0019).
    sujeitoTipo: z.enum(["caso", "participante", "familiar"]),
    sujeitoParticipanteId: z.string().uuid().optional(),
    sujeitoFamiliarId: z.string().min(1).optional(),
    titulo: z.string().min(1).max(200),
    prazoEm: z.string().min(1).optional(), // ISO date — o CHECK/tipo da coluna valida de novo
    instrucao: z.string().max(2000).optional(),
    idempotencyKey: z.string().min(1),
    // NUNCA adicione `papelDirigido`/`restrito`/`envioConjunto` aqui: essas três marcas são
    // copiadas do catálogo do programa DENTRO da RPC (`crm.solicitar_documento`, migration
    // 0024), nunca do corpo da requisição — design-tecnico.md §2 / contracts/operacoes.md
    // ("marca de restrito é copiada do programa, não digitada livremente"). Se o schema
    // aceitasse esses campos do body, quem chama a API poderia se auto-declarar não-restrita.
    // `.strict()` abaixo também recusa esses campos como "não declarados", em dobro com a
    // ausência deles aqui.
  })
  .strict();

// T056, Fase 5 (ADR-0019). Vínculo da pasta do caso no OneDrive corporativo — a ancestralidade
// de `folderItemId` sob a `pasta_raiz_item_id` da integração é validada em
// `criarManipuladorCasoComandos` via `IOGraphMicrosoftOAuth.listarAncestrais` (chamada viva ao Graph,
// que plpgsql não faz), ANTES de chamar a RPC `arquivos.vincular_pasta` (migration 0026).
export const VincularPastaSchema = z
  .object({
    acao: z.literal("vincular_pasta"),
    clienteId: z.string().uuid(),
    jornadaId: z.string().uuid(),
    integracaoId: z.string().uuid(),
    folderItemId: z.string().min(1),
    caminhoExibicao: z.string().max(500).optional(),
    idempotencyKey: z.string().min(1),
  })
  .strict();

// União discriminada por `acao` — novas ações futuras (T092) entram como mais um elemento desta
// lista, sem tocar nos `case` já implementados no switch abaixo.
const UniaoCasoComandos = z.discriminatedUnion("acao", [
  RegistrarContratoSchema,
  PrepararCasoSchema,
  ConvidarParticipanteSchema,
  RevogarParticipanteSchema,
  SolicitarDocumentoSchema,
  VincularPastaSchema,
]);

// Validação cruzada `sujeitoTipo` ↔ campo companheiro, ANTES de a requisição chegar na RPC —
// correção em 2026-10-16 (revisão adversarial): sem isto, uma combinação incoerente (ex.:
// `sujeitoTipo: "titular"` com `familiarId` preenchido) só era pega pelo CHECK do banco
// (`crm.participante_sujeito_coerente`/0017, `documento_sujeito_coerente`/0019), que levanta
// `23514` — ERRCODE que `erroDeNegocio()` não mapeava, caindo no 500 genérico sem sinal útil
// para quem chama. `superRefine` (não dá para usar `.refine()` por schema individual: um membro
// de `z.discriminatedUnion` precisa continuar sendo `ZodObject` puro, não `ZodEffects`) replica
// aqui a MESMA regra dos dois CHECKs, para responder 422 com mensagem clara antes do INSERT.
// O CHECK do banco continua como garantia final (defesa em profundidade) — ver também o branch
// `23514` novo em `erroDeNegocio()`, abaixo, como cinto-e-suspensório caso este `superRefine`
// tenha um bug.
export const EntradaCasoComandos = UniaoCasoComandos.superRefine((entrada, ctx) => {
  if (entrada.acao === "convidar_participante") {
    const { sujeitoTipo, familiarId, organizacaoId } = entrada;
    const coerente =
      (sujeitoTipo === "organizacao" && organizacaoId !== undefined && familiarId === undefined) ||
      (sujeitoTipo === "familiar" && familiarId !== undefined && organizacaoId === undefined) ||
      (sujeitoTipo === "titular" && familiarId === undefined && organizacaoId === undefined);
    if (!coerente) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sujeitoTipo incompatível com familiarId/organizacaoId informados",
        path: ["sujeitoTipo"],
      });
    }
  }
  if (entrada.acao === "solicitar_documento") {
    const { sujeitoTipo, sujeitoParticipanteId, sujeitoFamiliarId } = entrada;
    const coerente =
      (sujeitoTipo === "participante" &&
        sujeitoParticipanteId !== undefined &&
        sujeitoFamiliarId === undefined) ||
      (sujeitoTipo === "familiar" && sujeitoFamiliarId !== undefined && sujeitoParticipanteId === undefined) ||
      (sujeitoTipo === "caso" && sujeitoParticipanteId === undefined && sujeitoFamiliarId === undefined);
    if (!coerente) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sujeitoTipo incompatível com sujeitoParticipanteId/sujeitoFamiliarId informados",
        path: ["sujeitoTipo"],
      });
    }
  }
});
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
  /** Usado só por `vincular_pasta` (T056): acesso Graph pronto para uso (access token fresco via
   *  refresh do Vault + o `driveId`/`pastaRaizItemId` públicos da integração). `null` se a
   *  integração não existir — vira 422 (não é a RPC que checa isso, é esta leitura prévia). */
  prepararAcessoMicrosoft(
    integracaoId: string,
  ): Promise<{ accessToken: string; driveId: string; pastaRaizItemId: string } | null>;
  graph: Pick<IOGraphMicrosoftOAuth, "listarAncestrais">;
  rpc(
    nome:
      | "registrar_contrato"
      | "preparar_caso"
      | "convidar_participante"
      | "revogar_participante"
      | "solicitar_documento"
      | "vincular_pasta",
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
  // check_violation — backstop (cinto-e-suspensório) do `superRefine` em `EntradaCasoComandos`:
  // se a combinação `sujeitoTipo`/campo companheiro escapar da validação Zod e estourar o CHECK
  // do banco (`crm.participante_sujeito_coerente`/0017, `documento_sujeito_coerente`/0019),
  // responde 422 sanitizado em vez de 500 genérico — correção em 2026-10-16 (revisão
  // adversarial).
  if (error.code === "23514") return new HttpError(422, "Dados inválidos para esta operação");
  // unique_violation — ex.: dois admins registrando o primeiro contrato do mesmo cliente novo
  // ao mesmo tempo (crm_contratos_um_ativo_por_cliente, 0023). "Vínculo conflitante", categoria
  // 409 de design-tecnico.md §2 — não é 500 genérico, é um conflito real para o admin retentar.
  if (error.code === "23505") return new HttpError(409, "Conflito: já existe um registro equivalente");
  return new HttpError(500, "Não foi possível concluir agora");
}

/** Status de sucesso por ação: `registrar_contrato`/`convidar_participante`/
 *  `solicitar_documento` criam um recurso novo (201); `preparar_caso`/`revogar_participante`
 *  criam-ou-atualizam ou atualizam um recurso existente, então 200 — mesmo valor em replay de
 *  idempotência. */
function statusDeSucesso(acao: EntradaCasoComandos["acao"]): number {
  if (
    acao === "registrar_contrato" ||
    acao === "convidar_participante" ||
    acao === "solicitar_documento" ||
    acao === "vincular_pasta"
  ) {
    return 201;
  }
  return 200;
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
            case "convidar_participante": {
              const { data, error } = await io.rpc("convidar_participante", {
                p_cliente_id: entrada.clienteId,
                p_papel: entrada.papel,
                p_sujeito_tipo: entrada.sujeitoTipo,
                p_familiar_id: entrada.familiarId ?? null,
                p_organizacao_id: entrada.organizacaoId ?? null,
                p_nome_exibicao: entrada.nomeExibicao,
                p_email: entrada.email ?? null,
                p_autor_id: userId,
              });
              if (error) throw erroDeNegocio(error);
              return data;
            }
            case "revogar_participante": {
              const { data, error } = await io.rpc("revogar_participante", {
                p_participante_id: entrada.participanteId,
                p_autor_id: userId,
              });
              if (error) throw erroDeNegocio(error);
              return data;
            }
            case "solicitar_documento": {
              const { data, error } = await io.rpc("solicitar_documento", {
                p_cliente_id: entrada.clienteId,
                p_fase_id: entrada.faseId,
                p_requisito_id: entrada.requisitoId,
                p_sujeito_tipo: entrada.sujeitoTipo,
                p_sujeito_participante_id: entrada.sujeitoParticipanteId ?? null,
                p_sujeito_familiar_id: entrada.sujeitoFamiliarId ?? null,
                p_titulo: entrada.titulo,
                p_prazo_em: entrada.prazoEm ?? null,
                p_instrucao: entrada.instrucao ?? null,
                p_autor_id: userId,
              });
              if (error) throw erroDeNegocio(error);
              return data;
            }
            case "vincular_pasta": {
              // Ancestralidade é validada AQUI (Deno), com uma chamada viva ao Microsoft Graph —
              // plpgsql não faz HTTP (design-tecnico.md §2, T056). Caminho arbitrário fora da
              // raiz autorizada é recusado com 422 ANTES de chegar à RPC.
              const acesso = await io.prepararAcessoMicrosoft(entrada.integracaoId);
              if (!acesso) throw new HttpError(422, "Integração Microsoft inexistente");

              let ancestrais: string[];
              try {
                ancestrais = await io.graph.listarAncestrais({
                  accessToken: acesso.accessToken,
                  driveId: acesso.driveId,
                  itemId: entrada.folderItemId,
                });
              } catch {
                // "pasta inexistente → erro legível": nunca vaza o erro técnico do Graph (pode
                // incluir detalhe de rede/HTTP) — mensagem genérica, 422.
                throw new HttpError(422, "Pasta inexistente ou inacessível no OneDrive");
              }

              const dentroDaRaiz =
                entrada.folderItemId === acesso.pastaRaizItemId ||
                ancestrais.includes(acesso.pastaRaizItemId);
              if (!dentroDaRaiz) {
                throw new HttpError(422, "Pasta fora da raiz autorizada para esta integração");
              }

              const { data, error } = await io.rpc("vincular_pasta", {
                p_cliente_id: entrada.clienteId,
                p_jornada_id: entrada.jornadaId,
                p_integracao_id: entrada.integracaoId,
                p_folder_item_id: entrada.folderItemId,
                p_caminho_exibicao: entrada.caminhoExibicao ?? null,
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
