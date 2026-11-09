// _shared/envio-comandos.ts — lógica da Edge Function `envio-comandos` (E03-S07, Fase 5/US2,
// T059-T060, ADR-0019). Mesmo padrão porta/adapter de `caso-comandos.ts` (Zod `.strict()`, união
// discriminada por `acao`, `erroDeNegocio()` mapeando ERRCODE → HTTP, `criarManipuladorEnvioComandos(io)`
// como factory, exaustividade no `switch`) — NÃO copia o nome `CasoComandos`: esta função é
// "participante ou admin" (`requireAuthComPapel`, `_shared/auth.ts`), nunca admin-only.
//
// Diferenças de `caso-comandos.ts`, pelas razões do design-tecnico.md §2.1:
//   - `reservar_envio`/`enviar_etapa_para_avaliacao` NÃO exigem `idempotencyKey` (não estão na
//     lista de ações idempotentes de design-tecnico.md §2 "Regras transversais") — só
//     `finalizar_envio` passa por `comIdempotencia`. O dispatcher abaixo por isso NÃO extrai
//     `idempotencyKey` genericamente de toda `entrada` como `caso-comandos.ts` faz.
//   - `finalizar_envio` verifica o objeto no Storage (porta `IOStorageEnvios`) ANTES de chamar a
//     RPC — Storage não participa de transação Postgres, então a Edge Function faz essa
//     checagem fora da transação única (que cobre só a escrita em `arquivos.versoes`/
//     `documentos.documentos`/`arquivos.trabalhos_transferencia`).
//   - `erroDeNegocio()` ganha 4 ERRCODEs novos que `caso-comandos.ts` não precisava: `P0002`
//     (404, não confirma existência), `54000` (413, tamanho acima do limite), `55000` (409,
//     estado/reserva incompatível) e `40001` (409, revisão esperada divergente) — ver comentário
//     no topo da migration 0027 para a justificativa de cada um.
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { HttpError } from "./auth.ts";
import { corsHeaders } from "./cors.ts";
import { requireCsrfHeader } from "./csrf.ts";
import { comIdempotencia, type IOIdempotencia } from "./idempotencia.ts";
import { MIME_ACEITO, TAMANHO_MAXIMO_BYTES } from "./limites.ts";
import { assinaturaPdfValida, type IOStorageEnvios } from "./io-storage-envios.ts";
import { lerTextoComLimite } from "./corpo.ts";

const FN = "envio-comandos";
// Payload é só texto/número/UUID (sem upload — o binário vai direto ao bucket via TUS, nunca
// pelo corpo desta requisição) — mesmo teto de `caso-comandos.ts`.
const MAX_BYTES = 16 * 1024;

export const ReservarEnvioSchema = z
  .object({
    acao: z.literal("reservar_envio"),
    solicitacaoId: z.string().uuid().optional(),
    pagamentoId: z.string().uuid().optional(),
    nomeArquivo: z.string().min(1).max(200),
    tamanhoBytes: z.number().int().positive(),
    mime: z.string().min(1),
    // Sem idempotencyKey de propósito (ver comentário no topo do arquivo) — reservar de novo só
    // cria outra reserva que expira sozinha, sem efeito colateral grave.
  })
  .strict();

export const FinalizarEnvioSchema = z
  .object({
    acao: z.literal("finalizar_envio"),
    versaoId: z.string().uuid(),
    idempotencyKey: z.string().min(1),
    revisaoEsperada: z.number().int().min(1),
  })
  .strict();

export const EnviarEtapaParaAvaliacaoSchema = z
  .object({
    acao: z.literal("enviar_etapa_para_avaliacao"),
    etapaId: z.string().uuid(),
    revisaoEsperada: z.number().int().min(1),
  })
  .strict();

const UniaoEnvioComandos = z.discriminatedUnion("acao", [
  ReservarEnvioSchema,
  FinalizarEnvioSchema,
  EnviarEtapaParaAvaliacaoSchema,
]);

// `solicitacaoId` XOR `pagamentoId` — exatamente um dos dois, nunca nenhum nem os dois. Mesmo
// critério de `superRefine` em `caso-comandos.ts` (CHECK do banco, `versao_destino_unico`/0020,
// é o cinto-e-suspensório final; isto responde 422 limpo antes de chegar lá).
export const EntradaEnvioComandos = UniaoEnvioComandos.superRefine((entrada, ctx) => {
  if (entrada.acao === "reservar_envio") {
    const temSolicitacao = entrada.solicitacaoId !== undefined;
    const temPagamento = entrada.pagamentoId !== undefined;
    if (temSolicitacao === temPagamento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "informe exatamente um de solicitacaoId ou pagamentoId",
        path: ["solicitacaoId"],
      });
    }
  }
});
export type EntradaEnvioComandos = z.infer<typeof EntradaEnvioComandos>;

export interface ErroRpc {
  code?: string | null;
  message: string;
}

export interface RespostaRpc<T> {
  data: T | null;
  error: ErroRpc | null;
}

export interface ReservaEnvioRpc {
  versao_id: string;
  objeto_permitido: string;
  expira_em: string;
}

export interface VersaoRpc {
  id: string;
  estado_recebimento: string;
  estado_armazenamento: string;
  recebido_em: string | null;
}

export interface EtapaRpc {
  id: string;
  status: string;
  revisao: number;
}

export interface ReservaEnvioInfo {
  objetoPermitido: string;
  tamanhoDeclarado: number;
  mimeDeclarado: string;
}

export interface IOEnvioComandos {
  limite(req: Request): Promise<{ permitido: boolean; reiniciaEm: Date | null }>;
  /** Lança HttpError 401 se a sessão não for válida. Nunca lê userId/admin do body — só da
   *  sessão validada (`requireAuthComPapel`, `_shared/auth.ts`). */
  autenticar(req: Request): Promise<{ userId: string; admin: boolean }>;
  idempotencia: IOIdempotencia;
  storage: IOStorageEnvios;
  /** Leitura direta de `arquivos.reservas_envio` (admin-only, service_role) — só o necessário
   *  para `finalizar_envio` achar o caminho do objeto no bucket antes de verificá-lo. */
  obterReserva(versaoId: string): Promise<ReservaEnvioInfo | null>;
  rpc(
    nome: "reservar_envio" | "autorizar_finalizacao" | "finalizar_envio" | "enviar_etapa_para_avaliacao",
    params: Record<string, unknown>,
  ): Promise<RespostaRpc<unknown>>;
}

function json(corpo: unknown, status: number, cors: Record<string, string>, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "Content-Type": "application/json", ...extra },
  });
}

/** Mapeia o ERRCODE da guarda/validação SQL (migration 0027) para status HTTP — nunca vaza a
 *  mensagem de constraint/erro de banco ao cliente (RFC 7807 sanitizado). Os quatro primeiros
 *  códigos são os mesmos de `caso-comandos.ts`; os quatro últimos são novos desta função — ver
 *  comentário no topo da migration 0027 para a justificativa de cada um. */
function erroDeNegocio(error: ErroRpc): HttpError {
  if (error.code === "42501") return new HttpError(403, "Operação não autorizada");
  if (error.code === "22023") return new HttpError(422, "Dados inválidos para esta operação");
  if (error.code === "23514") return new HttpError(422, "Dados inválidos para esta operação");
  if (error.code === "23505") return new HttpError(409, "Conflito: já existe um registro equivalente");
  // P0002 (no_data_found) — recurso não encontrado, ou restrito de um jeito que não deve
  // confirmar a própria existência (fase não liberada, documento/pagamento de outro caso).
  if (error.code === "P0002") return new HttpError(404, "Não encontrado");
  // 54000 (program_limit_exceeded) — reaproveitado para "tamanho acima do limite": não existe
  // SQLSTATE padrão para "payload grande demais".
  if (error.code === "54000") return new HttpError(413, "Arquivo acima do limite permitido");
  // 55000 (object_not_in_prerequisite_state) — reserva expirada, ou versão que já saiu do
  // estado 'reservada' (ex.: finalizada por uma chamada concorrente).
  if (error.code === "55000") return new HttpError(409, "Conflito: operação não é mais válida para este estado");
  // 40001 (serialization_failure) — reaproveitado para "revisão esperada não bate": mesma
  // categoria semântica de conflito de concorrência que o SQLSTATE padrão já carrega.
  if (error.code === "40001") return new HttpError(409, "Conflito: o estado mudou desde a última leitura");
  return new HttpError(500, "Não foi possível concluir agora");
}

function statusDeSucesso(acao: EntradaEnvioComandos["acao"]): number {
  if (acao === "reservar_envio") return 201;
  return 200;
}

export function criarManipuladorEnvioComandos(io: IOEnvioComandos) {
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
      // Mesma posição de caso-comandos.ts: CSRF antes de autenticar.
      requireCsrfHeader(req);
      // Nunca confia em identidade/papel vindo do body — sempre resolvido pela sessão.
      const { userId, admin } = await io.autenticar(req);

      const bruto = await lerTextoComLimite(req, MAX_BYTES);
      if (bruto === null) {
        throw new HttpError(413, "Dados excedem limite");
      }

      let entrada: EntradaEnvioComandos;
      try {
        entrada = EntradaEnvioComandos.parse(JSON.parse(bruto));
      } catch {
        throw new HttpError(422, "Dados inválidos");
      }

      let resultado: unknown;

      switch (entrada.acao) {
        case "reservar_envio": {
          // Sem idempotencyKey (ver schema) — chama a RPC direto, sem comIdempotencia.
          const { data, error } = await io.rpc("reservar_envio", {
            p_solicitacao_id: entrada.solicitacaoId ?? null,
            p_pagamento_id: entrada.pagamentoId ?? null,
            p_nome_arquivo: entrada.nomeArquivo,
            p_tamanho_bytes: entrada.tamanhoBytes,
            p_mime: entrada.mime,
            p_eh_admin: admin,
            p_autor_id: userId,
          });
          if (error) throw erroDeNegocio(error);
          // Função RPC `RETURNS TABLE` — supabase-js devolve um array de linhas.
          const linha = (Array.isArray(data) ? data[0] : data) as ReservaEnvioRpc | undefined;
          if (!linha) throw new HttpError(500, "Não foi possível concluir agora");
          resultado = {
            versaoId: linha.versao_id,
            objetoPermitido: linha.objeto_permitido,
            expiraEm: linha.expira_em,
          };
          break;
        }
        case "finalizar_envio": {
          // Também valida antes do cache de idempotência e da leitura privilegiada do Storage:
          // usuário revogado ou de outro caso não pode recuperar resultado nem sondar arquivo.
          const { error: erroAutorizacao } = await io.rpc("autorizar_finalizacao", {
            p_versao_id: entrada.versaoId,
            p_autor_id: userId,
          });
          if (erroAutorizacao) throw erroDeNegocio(erroAutorizacao);
          resultado = await comIdempotencia(
            io.idempotencia,
            "finalizar_envio",
            entrada.idempotencyKey,
            { versaoId: entrada.versaoId, revisaoEsperada: entrada.revisaoEsperada },
            userId,
            async () => {
              const reserva = await io.obterReserva(entrada.versaoId);
              if (!reserva) throw new HttpError(404, "Não encontrado");

              const objeto = await io.storage.obterObjeto(reserva.objetoPermitido);
              // Objeto ausente no Storage NÃO confirma recebimento — ADR-0019 ponto 3. Não é
              // 404 (a versão/reserva existem) nem 422 (não é um problema de formato) — é um
              // conflito entre o que foi prometido e o que está lá, categoria 409 do
              // design-tecnico.md §2 "Erros" ("vínculo").
              if (!objeto) {
                throw new HttpError(
                  409,
                  "Arquivo não encontrado no armazenamento. Tente enviar novamente.",
                );
              }
              if (objeto.tamanhoBytes !== reserva.tamanhoDeclarado) {
                throw new HttpError(
                  422,
                  "O arquivo enviado não corresponde ao tamanho declarado na reserva.",
                );
              }
              if (reserva.mimeDeclarado !== MIME_ACEITO || !assinaturaPdfValida(objeto.primeirosBytes)) {
                throw new HttpError(422, "O arquivo enviado não é um PDF válido.");
              }
              if (reserva.tamanhoDeclarado > TAMANHO_MAXIMO_BYTES) {
                throw new HttpError(413, "Arquivo acima do limite permitido");
              }

              const { data, error } = await io.rpc("finalizar_envio", {
                p_versao_id: entrada.versaoId,
                p_revisao_esperada: entrada.revisaoEsperada,
                p_autor_id: userId,
              });
              if (error) throw erroDeNegocio(error);
              const linha = data as VersaoRpc;
              return {
                versaoId: linha.id,
                recebidoEm: linha.recebido_em,
                estadoArmazenamento: linha.estado_armazenamento,
              };
            },
          );
          break;
        }
        case "enviar_etapa_para_avaliacao": {
          const { data, error } = await io.rpc("enviar_etapa_para_avaliacao", {
            p_etapa_id: entrada.etapaId,
            p_revisao_esperada: entrada.revisaoEsperada,
            p_autor_id: userId,
          });
          if (error) throw erroDeNegocio(error);
          const linha = data as EtapaRpc;
          resultado = { etapaId: linha.id, status: linha.status, revisao: linha.revisao };
          break;
        }
        default: {
          // Exaustividade: união discriminada — novo literal de `acao` sem `case`
          // correspondente vira erro de compilação aqui, não comportamento silencioso.
          const _exaustivo: never = entrada;
          throw new HttpError(500, "Ação não implementada");
        }
      }

      return json(resultado, statusDeSucesso(entrada.acao), cors);
    } catch (erro) {
      if (erro instanceof HttpError) return json({ erro: erro.message }, erro.status, cors);
      console.warn(JSON.stringify({ ts: new Date().toISOString(), nivel: "warn", fn: FN, reqId, msg: "falha" }));
      return json({ erro: "Não foi possível concluir agora." }, 500, cors);
    }
  };
}
