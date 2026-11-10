// ia-apoio-configurar — E07-S05. Único lugar onde a chave OpenRouter da IA de apoio ao processo
// (pré-análise + rascunho de resposta) entra no Vault. Até aqui só entrava por RPC/SQL direto
// (ROADMAP, "Pendente"); esta função é a tela admin. Escopo fixo (`ESCOPO_IA_APOIO`), não por
// agente: é uma chave só para a instalação inteira, separada da do atendimento por decisão do
// usuário. Nunca devolve a chave de volta — só confirma que foi salva.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { HttpError, requireAdmin } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireCsrfHeader } from "../_shared/csrf.ts";
import { lerTextoComLimite } from "../_shared/corpo.ts";
import { clienteServico, escopoOpenRouter, salvarSegredo } from "../_shared/integracoes.ts";
import { ESCOPO_IA_APOIO } from "../_shared/segredos.ts";
import { TETOS, checarLimite, resposta429 } from "../_shared/rate-limit.ts";

const FN = "ia-apoio-configurar";
const MAX_BYTES = 4 * 1024;

const EntradaSchema = z.object({
  apiKeyOpenRouter: z.string().trim().min(1, "Informe a chave OpenRouter"),
});

serve(async (req) => {
  const cors = corsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: cors });

  const limite = await checarLimite({ req, rota: FN, ...TETOS[FN] });
  if (!limite.permitido) return resposta429(limite.reiniciaEm, cors);

  const reqId = crypto.randomUUID().slice(0, 8);
  try {
    requireCsrfHeader(req);
    await requireAdmin(req);
    const bruto = await lerTextoComLimite(req, MAX_BYTES);
    if (bruto === null) throw new HttpError(413, "Dados excedem limite");
    const { apiKeyOpenRouter } = EntradaSchema.parse(JSON.parse(bruto));

    const supabase = clienteServico();
    await salvarSegredo(supabase, escopoOpenRouter(ESCOPO_IA_APOIO), { apiKey: apiKeyOpenRouter });

    console.log(JSON.stringify({ ts: new Date().toISOString(), nivel: "info", fn: FN, reqId }));
    return new Response(JSON.stringify({ configurado: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (erro) {
    const status = erro instanceof HttpError ? erro.status : erro instanceof z.ZodError ? 400 : 500;
    const detalhe = erro instanceof HttpError
      ? erro.message
      : erro instanceof z.ZodError
      ? "Dados inválidos"
      : "Não foi possível salvar a chave";
    console.warn(JSON.stringify({ ts: new Date().toISOString(), nivel: "warn", fn: FN, reqId, status }));
    return new Response(JSON.stringify({ erro: detalhe, reqId }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
