// sessao-refresh — ADR-0008. Lê o refresh token do cookie (nunca do body/header), rotaciona a
// sessão no Supabase, regrava o cookie e devolve um access token novo. Chamado no boot da app
// (rehidratar sessão após F5) e ao receber 401.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getCookies, setCookie } from "https://deno.land/std@0.224.0/http/cookie.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { HttpError } from "../_shared/auth.ts";
import { requireCsrfHeader } from "../_shared/csrf.ts";

const FN = "sessao-refresh";
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

    const refreshToken = getCookies(req.headers)[REFRESH_COOKIE];
    if (!refreshToken) throw new HttpError(401, "Sessão ausente");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session || !data.user) throw new HttpError(401, "Sessão expirada");

    const headers = new Headers({ "Content-Type": "application/json", ...cors });
    setCookie(headers, {
      name: REFRESH_COOKIE,
      value: data.session.refresh_token,
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      path: "/",
    });

    return new Response(
      JSON.stringify({
        accessToken: data.session.access_token,
        expiresAt: data.session.expires_at,
        usuario: {
          id: data.user.id,
          email: data.user.email,
          papel: data.user.app_metadata?.role ?? null,
          clienteId: data.user.app_metadata?.cliente_id ?? undefined,
        },
      }),
      { status: 200, headers },
    );
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
