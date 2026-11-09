// documento-rascunho-resposta — E07-S05/US3. Lógica em `_shared/documento-rascunho.ts`.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireCsrfHeader } from "../_shared/csrf.ts";
import { TETOS, checarLimite } from "../_shared/rate-limit.ts";
import { gerarRascunhoResposta } from "../_shared/documento-rascunho.ts";
import { criarIODocumentoRascunho } from "../_shared/io-supabase-documento-rascunho.ts";

const FN = "documento-rascunho-resposta";

serve(async (req) => {
  const cors = corsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: cors });

  const limite = await checarLimite({ req, rota: FN, ...TETOS[FN] });
  if (!limite.permitido) {
    const segundos = limite.reiniciaEm
      ? Math.max(1, Math.ceil((limite.reiniciaEm.getTime() - Date.now()) / 1000))
      : 60;
    return new Response(JSON.stringify({ erro: "Muitas requisições. Tente de novo em instantes." }), {
      status: 429,
      headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(segundos) },
    });
  }

  try {
    requireCsrfHeader(req);
    await requireAdmin(req);

    const corpo = (await req.json().catch(() => null)) as { documentoId?: unknown } | null;
    if (!corpo || typeof corpo.documentoId !== "string") {
      return new Response(JSON.stringify({ erro: "documentoId obrigatório" }), {
        status: 422,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const io = criarIODocumentoRascunho();
    const rascunho = await gerarRascunhoResposta(io, fetch, corpo.documentoId);
    return new Response(
      JSON.stringify({
        id: rascunho.id,
        documento_id: rascunho.documentoId,
        texto: rascunho.texto,
        prazo_resposta_dias_uteis_usado: rascunho.prazoRespostaDiasUteisUsado,
        prioridade_usada: rascunho.prioridadeUsada,
        gerado_em: rascunho.geradoEm,
      }),
      { status: 201, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (erro) {
    const status = (erro as { status?: number }).status ?? 500;
    const mensagem = status < 500 ? (erro as Error).message : "Não foi possível concluir agora.";
    return new Response(JSON.stringify({ erro: mensagem }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
