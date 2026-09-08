// integracoes-ia-salvar — E13-S12. Único caminho de escrita de chaves pelo painel admin.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { HttpError, badRequest, requireAdmin } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireCsrfHeader } from "../_shared/csrf.ts";
import {
  clienteServico,
  escopoEvolution,
  escopoOpenRouter,
  obterSegredo,
  salvarSegredo,
  tokenAleatorio,
  urlSemBarraFinal,
  type SegredoEvolution,
  type SegredoOpenRouter,
} from "../_shared/integracoes.ts";
import { TETOS, checarLimite, resposta429 } from "../_shared/rate-limit.ts";

const FN = "integracoes-ia-salvar";
const MAX_BYTES = 24 * 1024;
const uuid = z.string().uuid();
const texto = (min: number, max: number) => z.string().trim().min(min).max(max);

const InputSchema = z
  .object({
    evolution: z
      .object({
        contaId: uuid.optional(),
        nomeExibicao: texto(2, 120),
        identificador: texto(8, 30),
        baseUrl: z
          .string()
          .trim()
          .url()
          .max(300)
          .refine((valor) => new URL(valor).protocol === "https:", "Evolution precisa de HTTPS"),
        instancia: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
        apiKey: z.string().trim().min(8).max(2048).optional(),
        ativa: z.boolean(),
      })
      .strict(),
    agente: z
      .object({
        agenteId: uuid.optional(),
        nome: texto(2, 120),
        funcao: texto(2, 160),
        alma: texto(20, 6000),
        saudacao: texto(2, 1000),
        mensagemHandoff: texto(2, 1000),
        modelo: texto(2, 160),
        apiKeyOpenRouter: z.string().trim().min(8).max(2048).optional(),
        ativo: z.boolean(),
      })
      .strict(),
  })
  .strict();

interface LinhaConta {
  id: string;
  provedor: string;
}

serve(async (req) => {
  const cors = corsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: cors });

  const limite = await checarLimite({ req, rota: FN, ...TETOS[FN] });
  if (!limite.permitido) return resposta429(limite.reiniciaEm, cors);

  const reqId = crypto.randomUUID().slice(0, 8);
  try {
    requireCsrfHeader(req);
    const { userId } = await requireAdmin(req);
    const bruto = await req.text();
    if (new TextEncoder().encode(bruto).byteLength > MAX_BYTES) throw new HttpError(413, "Dados excedem limite");
    const entrada = InputSchema.parse(JSON.parse(bruto));
    const supabase = clienteServico();

    const contaId = entrada.evolution.contaId ?? crypto.randomUUID();
    const { data: contaExistente, error: erroConta } = await supabase
      .schema("configuracoes")
      .from("contas_canal")
      .select("id,provedor")
      .eq("id", contaId)
      .maybeSingle<LinhaConta>();
    if (erroConta) throw new HttpError(500, "Não foi possível validar conta de canal");
    if (contaExistente && contaExistente.provedor !== "evolution") {
      throw badRequest("Conta selecionada não pertence à Evolution");
    }

    const segredoEvolutionAnterior = await obterSegredo<SegredoEvolution>(
      supabase,
      escopoEvolution(contaId),
    );
    const apiKeyEvolution = entrada.evolution.apiKey ?? segredoEvolutionAnterior?.apiKey;
    if (!apiKeyEvolution) throw badRequest("Informe a chave da Evolution nesta primeira configuração");
    const webhookToken = segredoEvolutionAnterior?.webhookToken ?? tokenAleatorio();

    // Mantém canal inativo enquanto o webhook é instalado. Falha externa não habilita resposta.
    const valoresConta = {
      id: contaId,
      provedor: "evolution" as const,
      nome_exibicao: entrada.evolution.nomeExibicao,
      identificador: entrada.evolution.identificador,
      ativa: false,
      credenciais_configuradas: true,
      metadados_publicos: {
        baseUrl: urlSemBarraFinal(entrada.evolution.baseUrl),
        instancia: entrada.evolution.instancia,
      },
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };
    const contaQuery = contaExistente
      ? supabase.schema("configuracoes").from("contas_canal").update(valoresConta).eq("id", contaId)
      : supabase.schema("configuracoes").from("contas_canal").insert({ ...valoresConta, created_by: userId });
    const { error: erroSalvarConta } = await contaQuery;
    if (erroSalvarConta) throw new HttpError(500, "Não foi possível salvar conta de canal");

    await salvarSegredo(supabase, escopoEvolution(contaId), {
      apiKey: apiKeyEvolution,
      webhookToken,
    });

    const urlProjeto = Deno.env.get("SUPABASE_URL");
    if (!urlProjeto) throw new HttpError(500, "Ambiente Supabase incompleto");
    const urlWebhook = `${urlSemBarraFinal(urlProjeto)}/functions/v1/evolution-webhook?conta=${contaId}`;
    const respostaEvolution = await fetch(
      `${urlSemBarraFinal(entrada.evolution.baseUrl)}/webhook/set/${encodeURIComponent(entrada.evolution.instancia)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKeyEvolution },
        body: JSON.stringify({
          enabled: true,
          url: urlWebhook,
          events: ["MESSAGES_UPSERT"],
          headers: { "x-akros-webhook": webhookToken },
          base64: false,
        }),
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!respostaEvolution.ok) throw new HttpError(502, "Não foi possível registrar webhook na Evolution");

    const agenteId = entrada.agente.agenteId ?? crypto.randomUUID();
    const segredoOpenRouterAnterior = await obterSegredo<SegredoOpenRouter>(
      supabase,
      escopoOpenRouter(agenteId),
    );
    const apiKeyOpenRouter = entrada.agente.apiKeyOpenRouter ?? segredoOpenRouterAnterior?.apiKey;
    if (!apiKeyOpenRouter) throw badRequest("Informe a chave OpenRouter nesta primeira configuração");
    await salvarSegredo(supabase, escopoOpenRouter(agenteId), { apiKey: apiKeyOpenRouter });

    const { data: agenteExistente, error: erroAgenteExistente } = entrada.agente.agenteId
      ? await supabase
          .schema("comunicacao")
          .from("regras_atendimento_ia")
          .select("contas_canal_ids")
          .eq("id", agenteId)
          .maybeSingle<{ contas_canal_ids: unknown }>()
      : { data: null, error: null };
    if (erroAgenteExistente) throw new HttpError(500, "Não foi possível validar agente");
    const contasAtuais = Array.isArray(agenteExistente?.contas_canal_ids)
      ? agenteExistente.contas_canal_ids.filter((id): id is string => typeof id === "string")
      : [];

    const regra = {
      id: agenteId,
      ativo: entrada.agente.ativo,
      nome_agente: entrada.agente.nome,
      funcao: entrada.agente.funcao,
      contas_canal_ids: [...new Set([...contasAtuais, contaId])],
      alma: entrada.agente.alma,
      saudacao: entrada.agente.saudacao,
      janelas_atendimento: [],
      topicos: [],
      mensagem_handoff: entrada.agente.mensagemHandoff,
      base_conhecimento_ids: [],
      correcoes: [],
      memoria: { ativa: true, escopo: "por_conversa", retencao: "90 dias", campos: [] },
      llm: { provedor: "openrouter", modelo: entrada.agente.modelo, apiKeyConfigurada: true },
      updated_at: new Date().toISOString(),
    };
    const { error: erroAgente } = await supabase
      .schema("comunicacao")
      .from("regras_atendimento_ia")
      .upsert(regra, { onConflict: "id" });
    if (erroAgente) throw new HttpError(500, "Não foi possível salvar agente");

    const { error: erroAtivarConta } = await supabase
      .schema("configuracoes")
      .from("contas_canal")
      .update({ ativa: entrada.evolution.ativa, updated_by: userId, updated_at: new Date().toISOString() })
      .eq("id", contaId);
    if (erroAtivarConta) throw new HttpError(500, "Não foi possível concluir configuração do canal");

    console.log(JSON.stringify({ ts: new Date().toISOString(), nivel: "info", fn: FN, reqId, contaId, agenteId }));
    return new Response(
      JSON.stringify({ contaId, agenteId, canalAtivo: entrada.evolution.ativa, agenteAtivo: entrada.agente.ativo }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (erro) {
    const status = erro instanceof HttpError ? erro.status : erro instanceof z.ZodError ? 400 : 500;
    const detalhe = erro instanceof HttpError ? erro.message : erro instanceof z.ZodError ? "Dados inválidos" : "Não foi possível salvar integração";
    console.warn(JSON.stringify({ ts: new Date().toISOString(), nivel: "warn", fn: FN, reqId, status }));
    return new Response(JSON.stringify({ erro: detalhe, reqId }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
