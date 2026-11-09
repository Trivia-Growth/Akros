// comunicacao-chat-portal — E08-S05. Cliente (participante) ou admin envia mensagem no chat do
// portal. Lógica em `_shared/comunicacao-chat-portal.ts`.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireCsrfHeader } from "../_shared/csrf.ts";
import { TETOS, checarLimite } from "../_shared/rate-limit.ts";
import { enviarMensagemPortal } from "../_shared/comunicacao-chat-portal.ts";
import { criarIOChatPortal } from "../_shared/io-supabase-comunicacao-chat-portal.ts";

const FN = "comunicacao-chat-portal";

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
    const { userId, ehAdmin } = await requireAuth(req);

    const corpo = (await req.json().catch(() => null)) as { clienteId?: unknown; conteudo?: unknown } | null;
    if (!corpo || typeof corpo.clienteId !== "string" || typeof corpo.conteudo !== "string") {
      return new Response(JSON.stringify({ erro: "clienteId e conteudo obrigatórios" }), {
        status: 422,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const io = criarIOChatPortal();
    const evento = await enviarMensagemPortal(io, userId, ehAdmin, corpo.clienteId, corpo.conteudo);
    return new Response(JSON.stringify(evento), {
      status: 201,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (erro) {
    const status = (erro as { status?: number }).status ?? 500;
    const mensagem = status < 500 ? (erro as Error).message : "Não foi possível concluir agora.";
    return new Response(JSON.stringify({ erro: mensagem }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
