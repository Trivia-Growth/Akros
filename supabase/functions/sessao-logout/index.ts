// sessao-logout — ADR-0008. Revoga a sessão no Supabase (usando o access token que o front manda
// no Authorization, já que ele vive só na memória do browser) e limpa o cookie de refresh sempre,
// mesmo se a revogação falhar (token já expirado, por exemplo) — logout nunca deve travar.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { deleteCookie } from "https://deno.land/std@0.224.0/http/cookie.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { requireCsrfHeader } from "../_shared/csrf.ts";
import { HttpError } from "../_shared/auth.ts";

const FN = "sessao-logout";
const REFRESH_COOKIE = "akros_refresh_token";

serve(async (req) => {
  const cors = corsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors, status: 204 });

  const reqId = crypto.randomUUID().slice(0, 8);
  console.log(
    JSON.stringify({ ts: new Date().toISOString(), nivel: "info", fn: FN, reqId, method: req.method }),
  );

  try {
    requireCsrfHeader(req);

    const accessToken = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (accessToken) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
      );
      await supabase.auth.signOut().catch(() => {
        // best-effort: token pode já ter expirado — o cookie é limpo de qualquer forma abaixo.
      });
    }

    const headers = new Headers({ "Content-Type": "application/json", ...cors });
    deleteCookie(headers, REFRESH_COOKIE, { path: "/" });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (e) {
    if (e instanceof HttpError) return problem(e.status, e.message, reqId, cors);
    console.error(JSON.stringify({ ts: new Date().toISOString(), nivel: "error", fn: FN, reqId }));
    return problem(500, "Erro interno", reqId, cors);
  }
});

function problem(status: number, detail: string, reqId: string, cors: Record<string, string>): Response {
  const titles: Record<number, string> = {
    401: "Unauthorized",
    500: "Internal Server Error",
  };
  const body = { type: "about:blank", title: titles[status] ?? "Error", status, detail, reqId };
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/problem+json", ...cors },
  });
}
