// _shared/cors.ts — CORS para Edge Functions. Vale para os dois perfis.
// Em produção, FIXE o domínio. Lista vinda de env (CORS_ALLOWED_ORIGINS), nunca "*".
const allowed = (Deno.env.get("CORS_ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim());

export function corsHeaders(origin: string | null): Record<string, string> {
  const bateAllowlist = origin != null && allowed.includes(origin);
  // E01-S48: sem isso, um Origin fora da allowlist (ex.: domínio de produção esquecido em
  // CORS_ALLOWED_ORIGINS) falha silencioso — o browser bloqueia a resposta e o usuário vê
  // "Failed to send a request to the Edge Function" sem nenhum rastro nos logs da function.
  if (origin != null && !bateAllowlist) {
    console.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        nivel: "warn",
        msg: "Origin fora de CORS_ALLOWED_ORIGINS",
        origin,
      }),
    );
  }
  const allow = bateAllowlist ? (origin as string) : (allowed[0] ?? "");
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-akros-csrf",
    // GET, não só POST: achado empírico desta task (E03-S07, onedrive-oauth, T054) — `GET
    // /iniciar` é chamado por `fetch` (não navegação de topo) com header custom
    // (x-akros-csrf), então o browser faz preflight mesmo sendo GET; a allowlist de métodos
    // sendo só "POST, OPTIONS" fazia o preflight passar mas o browser bloquear a requisição
    // real por método não anunciado. Ampliar aqui é seguro: a allowlist de métodos é só o que o
    // preflight anuncia, cada função continua recusando por si (405) o método que não implementa.
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    // Achado empírico desta task: `onedrive-oauth GET /iniciar` grava um cookie httpOnly de
    // estado (state+PKCE) na resposta a um `fetch` cross-origin (API do projeto Supabase é
    // origem diferente do front-end). Sem `Allow-Credentials`, o browser recusa até GUARDAR o
    // Set-Cookie de uma resposta cross-origin a um fetch com `credentials: "include"` — o cookie
    // nunca chegaria no navegador para `/callback` ler de volta. Só funciona porque `allow`
    // acima NUNCA é "*" (sempre a origem específica da allowlist) — Allow-Credentials com
    // Allow-Origin "*" é combinação que o browser rejeita.
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}
