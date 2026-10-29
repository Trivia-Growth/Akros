// integracoes-ia-salvar — E13-S12/E13-S13. Caminho de escrita de chaves do painel admin para o agente
// e para as contas da Meta (WhatsApp oficial e Instagram). A Evolution saiu daqui na E13-S15: servidor,
// instância, webhook (com releitura), QR e estado vivem em `canal-evolution`.
// Nenhuma chave volta na resposta: só identificadores, estado e o endereço do webhook (público).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { HttpError, badRequest, requireAdmin } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireCsrfHeader } from "../_shared/csrf.ts";
import {
  clienteServico,
  escopoMetaInstagram,
  escopoMetaWhatsApp,
  escopoOpenRouter,
  obterSegredo,
  salvarSegredo,
  type SegredoMeta,
  type SegredoOpenRouter,
} from "../_shared/integracoes.ts";
import { EntradaSchema, urlWebhook, type Canal } from "../_shared/integracoes-schema.ts";
import { TETOS, checarLimite, resposta429 } from "../_shared/rate-limit.ts";
import { lerTextoComLimite } from "../_shared/corpo.ts";

const FN = "integracoes-ia-salvar";
const MAX_BYTES = 24 * 1024;

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
    const bruto = await lerTextoComLimite(req, MAX_BYTES);
    if (bruto === null) throw new HttpError(413, "Dados excedem limite");
    const { canal, agente } = EntradaSchema.parse(JSON.parse(bruto));
    const supabase = clienteServico();
    const urlProjeto = Deno.env.get("SUPABASE_URL");
    if (!urlProjeto) throw new HttpError(500, "Ambiente Supabase incompleto");

    // Canal é opcional: sem ele só o agente é salvo (para testar no Playground antes de conectar).
    const conta = canal ? await prepararCanal(supabase, canal, userId, urlProjeto) : null;
    const contaId = conta?.contaId ?? null;
    const webhookUrl = conta?.webhookUrl ?? null;

    // 4) Agente (chave OpenRouter no Vault, regra em tabela admin-only).
    const agenteId = agente.agenteId ?? crypto.randomUUID();
    const segredoIA = await obterSegredo<SegredoOpenRouter>(supabase, escopoOpenRouter(agenteId));
    const apiKeyOpenRouter = agente.apiKeyOpenRouter ?? segredoIA?.apiKey;
    if (!apiKeyOpenRouter) throw badRequest("Informe a chave OpenRouter nesta primeira configuração");
    await salvarSegredo(supabase, escopoOpenRouter(agenteId), { apiKey: apiKeyOpenRouter });

    const { data: agenteExistente, error: erroAgenteExistente } = agente.agenteId
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
      ativo: agente.ativo,
      nome_agente: agente.nome,
      funcao: agente.funcao,
      contas_canal_ids: [...new Set([...contasAtuais, ...(contaId ? [contaId] : [])])],
      alma: agente.alma,
      saudacao: agente.saudacao,
      janelas_atendimento: [],
      topicos: [],
      mensagem_handoff: agente.mensagemHandoff,
      base_conhecimento_ids: [],
      correcoes: [],
      memoria: { ativa: true, escopo: "por_conversa", retencao: "90 dias", campos: [] },
      llm: { provedor: "openrouter", modelo: agente.modelo, apiKeyConfigurada: true },
      updated_at: new Date().toISOString(),
    };
    const { error: erroAgente } = await supabase
      .schema("comunicacao")
      .from("regras_atendimento_ia")
      .upsert(regra, { onConflict: "id" });
    if (erroAgente) throw new HttpError(500, "Não foi possível salvar agente");

    // 5) Só agora a conta passa a valer: credenciais confirmadas e estado pedido pelo admin.
    if (canal && contaId) {
      const { error: erroAtivarConta } = await supabase
        .schema("configuracoes")
        .from("contas_canal")
        .update({
          ativa: canal.ativa,
          credenciais_configuradas: true,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contaId);
      if (erroAtivarConta) throw new HttpError(500, "Não foi possível concluir configuração do canal");
    }

    console.log(JSON.stringify({ ts: new Date().toISOString(), nivel: "info", fn: FN, reqId, contaId, agenteId, provedor: canal?.provedor ?? null }));
    return new Response(
      JSON.stringify({
        contaId,
        agenteId,
        provedor: canal?.provedor ?? null,
        canalAtivo: canal?.ativa ?? null,
        agenteAtivo: agente.ativo,
        // Público por desenho: é o que o administrador cola no painel da Meta (e a Evolution já recebeu).
        // `null` quando só o agente foi salvo.
        webhookUrl,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (erro) {
    const status = erro instanceof HttpError ? erro.status : erro instanceof z.ZodError ? 400 : 500;
    const detalhe = erro instanceof HttpError
      ? erro.message
      : erro instanceof z.ZodError
      ? "Dados inválidos"
      : "Não foi possível salvar integração";
    console.warn(JSON.stringify({ ts: new Date().toISOString(), nivel: "warn", fn: FN, reqId, status }));
    return new Response(JSON.stringify({ erro: detalhe, reqId }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

function escopoDaConta(provedor: Canal["provedor"], contaId: string): string {
  return provedor === "whatsapp_oficial" ? escopoMetaWhatsApp(contaId) : escopoMetaInstagram(contaId);
}

function metadadosPublicos(canal: Canal): Record<string, string> {
  if (canal.provedor === "whatsapp_oficial") {
    return { phoneNumberId: canal.phoneNumberId, wabaId: canal.wabaId };
  }
  return { igAccountId: canal.igAccountId };
}

/** Junta o que veio no formulário com o que já está no Vault; campo em branco mantém o guardado. */
async function montarSegredo(
  supabase: ReturnType<typeof clienteServico>,
  canal: Canal,
  escopo: string,
): Promise<{ valor: Record<string, string> }> {
  const anterior = await obterSegredo<SegredoMeta>(supabase, escopo);
  const accessToken = canal.accessToken ?? anterior?.accessToken;
  const appSecret = canal.appSecret ?? anterior?.appSecret;
  const verifyToken = canal.verifyToken ?? anterior?.verifyToken;
  if (!accessToken || !appSecret || !verifyToken) {
    throw badRequest("Informe o token de acesso, o App Secret e o token de verificação na primeira configuração");
  }
  return { valor: { accessToken, appSecret, verifyToken } };
}

/** Passos 1 a 3: valida a conta e grava segredos e conta (INATIVA). */
async function prepararCanal(
  supabase: ReturnType<typeof clienteServico>,
  canal: Canal,
  userId: string,
  urlProjeto: string,
): Promise<{ contaId: string; webhookUrl: string }> {
  const contaId = canal.contaId ?? crypto.randomUUID();
  const { data: contaExistente, error: erroConta } = await supabase
    .schema("configuracoes")
    .from("contas_canal")
    .select("id,provedor")
    .eq("id", contaId)
    .is("deleted_at", null)
    .maybeSingle<LinhaConta>();
  if (erroConta) throw new HttpError(500, "Não foi possível validar conta de canal");
  if (contaExistente && contaExistente.provedor !== canal.provedor) {
    throw badRequest("Conta selecionada pertence a outro tipo de canal");
  }

  // 1) Segredos da conta: calcula tudo ANTES de gravar qualquer coisa, para uma entrada incompleta
  //    recusar sem deixar conta pela metade.
  const escopo = escopoDaConta(canal.provedor, contaId);
  const segredoNovo = await montarSegredo(supabase, canal, escopo);
  const webhookUrl = urlWebhook(urlProjeto, canal.provedor, contaId);

  // 2) Conta fica INATIVA e sem credenciais até tudo dar certo. Falha externa não liga resposta.
  const valoresConta = {
    id: contaId,
    provedor: canal.provedor,
    nome_exibicao: canal.nomeExibicao,
    identificador: canal.identificador,
    ativa: false,
    metadados_publicos: metadadosPublicos(canal),
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };
  const gravarConta = contaExistente
    ? supabase.schema("configuracoes").from("contas_canal").update(valoresConta).eq("id", contaId)
    : supabase.schema("configuracoes").from("contas_canal").insert({ ...valoresConta, created_by: userId });
  const { error: erroSalvarConta } = await gravarConta;
  if (erroSalvarConta) throw new HttpError(500, "Não foi possível salvar conta de canal");

  await salvarSegredo(supabase, escopo, segredoNovo.valor);

  // 3) Meta: o administrador registra a URL e o token de verificação no painel dela.
  return { contaId, webhookUrl };
}
