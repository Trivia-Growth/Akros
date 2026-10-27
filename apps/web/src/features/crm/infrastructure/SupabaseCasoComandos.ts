// E03-S07 (T033) — adapter de `CasoComandos`: liga o portal admin à Edge Function
// `caso-comandos` (já aprovada em T031/T032 — ver `supabase/functions/_shared/caso-comandos.ts`).
// Mesmo estilo de invocação de `PlaygroundAgente.tsx` (`getSupabase().functions.invoke`), com o
// header CSRF exigido por `requireCsrfHeader` no servidor.
//
// `erroDetalhado` (`@/shared/lib/http/edge-function-error.ts`) não serve aqui: ele só lê
// `corpo.detail` (RFC 7807), e esta função responde `{ erro: "mensagem" }` (mesmo padrão de
// `agente-playground`/`integracoes-ia-salvar`), então sempre cairia no fallback genérico do SDK
// — perdendo a mensagem real e o status HTTP. `erroCasoComandos` abaixo lê `error.context`
// (a `Response` bruta) direto, sem passar por `erroDetalhado`.
import { getSupabase } from "@/shared/supabase/client";
import type { CasoComandos } from "../application/ports";
import { CasoComandoError } from "../application/ports";
import type { Contrato, ContratoCondicao, Prioridade } from "../domain/contrato";
import type { Participante } from "../domain/participante";
import { type LinhaParticipanteSupabase, paraParticipante } from "./SupabaseParticipantesConsulta";

const CABECALHO_CSRF = { "x-akros-csrf": "1" };

/** Linha de `crm.contratos` devolvida por `crm.registrar_contrato` (RPC retorna `crm.contratos`
 *  ROWTYPE — ver migration 0022). Nomes de coluna em snake_case, como sempre no Postgres. */
interface LinhaContratoSupabase {
  id: string;
  cliente_id: string;
  programa_id: string;
  programa_versao: string;
  assinado_em: string | null;
  prazo_resposta_dias_uteis: number;
  prioridade: Prioridade;
  observacao: string | null;
  registrado_por: string;
  registrado_em: string;
  substitui_contrato_id: string | null;
  ativo: boolean;
}

/** Linha de `jornada.jornadas` devolvida por `crm.preparar_caso` (RPC retorna
 *  `jornada.jornadas` ROWTYPE — ver migration 0022). Só os campos que o chamador usa hoje. */
interface LinhaJornadaSupabase {
  id: string;
  cliente_id: string;
  fase_atual_id: string | null;
}

function paraContrato(linha: LinhaContratoSupabase): Contrato {
  return {
    id: linha.id,
    clienteId: linha.cliente_id,
    programaId: linha.programa_id,
    programaVersao: linha.programa_versao,
    assinadoEm: linha.assinado_em ?? undefined,
    prazoRespostaDiasUteis: linha.prazo_resposta_dias_uteis,
    prioridade: linha.prioridade,
    observacao: linha.observacao ?? undefined,
    // SPEC_DEVIATION: crm.registrar_contrato devolve só a linha de crm.contratos (RETURNS
    // crm.contratos) — as condições financeiras que foram inseridas na mesma transação em
    // crm.contrato_condicoes não voltam na resposta da RPC, então não há `id` real de servidor
    // pra devolver aqui sem um round-trip extra (fora de escopo de T033-035, que é só
    // frontend). Nenhuma tela consome este retorno ainda (T037/T038 são futuras) — quando uma
    // precisar das condições com id real, o caminho é ajustar a RPC pra devolver também as
    // condições (ou buscar via select separado), não fabricar id no cliente.
    condicoes: [] as ContratoCondicao[],
    registradoPor: linha.registrado_por,
    registradoEm: linha.registrado_em,
    ativo: linha.ativo,
  };
}

function paraPreparoCaso(linha: LinhaJornadaSupabase): {
  id: string;
  clienteId: string;
  faseAtualId: string | null;
} {
  return { id: linha.id, clienteId: linha.cliente_id, faseAtualId: linha.fase_atual_id };
}

/** Lê `error.context` (a `Response` bruta que o supabase-js anexa em erro de Edge Function) pra
 *  extrair o status HTTP real e a mensagem de `{ erro: "..." }` que o servidor devolveu. Sem
 *  `context` (falha de rede, não resposta HTTP) cai em status 500 com a mensagem original do
 *  SDK, sem tentar ler `.json()` de algo que não existe. */
async function erroCasoComandos(error: unknown): Promise<CasoComandoError> {
  const mensagemOriginal = error instanceof Error ? error.message : String(error);
  const contexto = (error as { context?: Response })?.context;
  if (!contexto) return new CasoComandoError(500, mensagemOriginal);

  let mensagem = mensagemOriginal;
  try {
    const corpoErro = await contexto.clone().json();
    if (typeof corpoErro?.erro === "string" && corpoErro.erro) mensagem = corpoErro.erro;
  } catch {
    // corpo não era JSON (ou já consumido) — fica com a mensagem original do SDK.
  }
  return new CasoComandoError(contexto.status, mensagem);
}

async function invocar(acao: string, corpo: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await getSupabase().functions.invoke("caso-comandos", {
    headers: CABECALHO_CSRF,
    body: { acao, ...corpo },
  });
  if (error) throw await erroCasoComandos(error);
  return data;
}

export class SupabaseCasoComandos implements CasoComandos {
  async vincularPasta(input: Parameters<CasoComandos["vincularPasta"]>[0]): Promise<void> {
    await invocar("vincular_pasta", { ...input });
  }

  async registrarContrato(
    input: Parameters<CasoComandos["registrarContrato"]>[0],
  ): Promise<Contrato> {
    const data = await invocar("registrar_contrato", { ...input });
    return paraContrato(data as LinhaContratoSupabase);
  }

  async prepararCaso(
    input: Parameters<CasoComandos["prepararCaso"]>[0],
  ): Promise<{ id: string; clienteId: string; faseAtualId: string | null }> {
    const data = await invocar("preparar_caso", { ...input });
    return paraPreparoCaso(data as LinhaJornadaSupabase);
  }

  async convidarParticipante(
    input: Parameters<CasoComandos["convidarParticipante"]>[0],
  ): Promise<Participante> {
    const data = await invocar("convidar_participante", { ...input });
    return paraParticipante(data as LinhaParticipanteSupabase);
  }

  async revogarParticipante(
    input: Parameters<CasoComandos["revogarParticipante"]>[0],
  ): Promise<Participante> {
    const data = await invocar("revogar_participante", { ...input });
    return paraParticipante(data as LinhaParticipanteSupabase);
  }
}
