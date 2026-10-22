// onedrive-oauth.test.ts — E03-S07 Fase 5 (T055). Deno test, só fakes de `IOGraphMicrosoft`/
// `IOOnedriveOauth`: nenhum teste aqui toca rede nem Postgres real (ver "Honestidade obrigatória"
// no brief desta task — este sandbox não tem app registration real no Azure AD nem tenant
// Microsoft). Mesmo estilo de `caso-comandos.test.ts`.
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HttpError } from "../_shared/auth.ts";
import {
  COOKIE_NOME,
  criarManipuladorOnedriveOauth,
  empacotarEstadoCookie,
  type IOOnedriveOauth,
  type OnedriveOauthConfig,
} from "../_shared/onedrive-oauth.ts";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const CONFIG: OnedriveOauthConfig = {
  clientId: "client-de-teste",
  tenantId: "organizations",
  redirectUriCallback: "https://p.supabase.co/functions/v1/onedrive-oauth/callback",
  frontendRetornoUrl: "https://app.akros.exemplo/admin/configuracoes",
};

interface Espiao {
  salvarSegredoVault: number;
  criarIntegracao: number;
  trocarCodigoPorToken: number;
  ultimaChamadaCriarIntegracao: Record<string, unknown> | null;
}

function montar(
  a: {
    admin?: "ok" | "401" | "403";
    limite?: boolean;
    trocaFalha?: boolean;
  } = {},
): { h: (req: Request) => Promise<Response>; e: Espiao } {
  const e: Espiao = {
    salvarSegredoVault: 0,
    criarIntegracao: 0,
    trocarCodigoPorToken: 0,
    ultimaChamadaCriarIntegracao: null,
  };

  const io: IOOnedriveOauth = {
    limite: () => Promise.resolve({ permitido: a.limite ?? true, reiniciaEm: null }),
    autenticarAdmin: () => {
      if (a.admin === "401") return Promise.reject(new HttpError(401, "Token inválido"));
      if (a.admin === "403") return Promise.reject(new HttpError(403, "Apenas administradores"));
      return Promise.resolve({ userId: ADMIN_ID });
    },
    graph: {
      trocarCodigoPorToken: () => {
        e.trocarCodigoPorToken++;
        if (a.trocaFalha) return Promise.reject(new Error("troca de token falhou"));
        return Promise.resolve({
          accessToken: "access-token-fake",
          refreshToken: "refresh-token-fake",
          expiraEm: 3600,
        });
      },
    },
    salvarSegredoVault: (_escopo, _valor) => {
      e.salvarSegredoVault++;
      return Promise.resolve();
    },
    criarIntegracao: (params) => {
      e.criarIntegracao++;
      e.ultimaChamadaCriarIntegracao = params as unknown as Record<string, unknown>;
      return Promise.resolve();
    },
  };

  return { h: criarManipuladorOnedriveOauth(io, CONFIG), e };
}

function reqIniciar(
  query: Record<string, string> = {
    contaEmail: "ops@akros.exemplo",
    driveId: "drive-1",
    pastaRaizItemId: "pasta-raiz-1",
  },
  headersExtra: Record<string, string> = { "x-akros-csrf": "1" },
): Request {
  const url = new URL("https://p.supabase.co/functions/v1/onedrive-oauth/iniciar");
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return new Request(url, {
    method: "GET",
    headers: { Origin: "http://localhost:5173", Authorization: "Bearer token-de-teste", ...headersExtra },
  });
}

function reqCallback(query: Record<string, string>, cookie?: string): Request {
  const url = new URL("https://p.supabase.co/functions/v1/onedrive-oauth/callback");
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const headers: Record<string, string> = { Origin: "http://localhost:5173" };
  if (cookie) headers.Cookie = `${COOKIE_NOME}=${cookie}`;
  return new Request(url, { method: "GET", headers });
}

// ── /iniciar ─────────────────────────────────────────────────────────────────────────────────

Deno.test("iniciar: CSRF ausente é 401, antes de autenticar", async () => {
  const { h } = montar();
  const r = await h(reqIniciar(undefined, {}));
  assertEquals(r.status, 401);
});

Deno.test("iniciar: chamador sem papel admin é 401/403", async () => {
  const a = montar({ admin: "401" });
  assertEquals((await a.h(reqIniciar())).status, 401);

  const b = montar({ admin: "403" });
  assertEquals((await b.h(reqIniciar())).status, 403);
});

Deno.test("iniciar: query sem contaEmail/driveId/pastaRaizItemId é 422", async () => {
  const { h } = montar();
  const r = await h(reqIniciar({}));
  assertEquals(r.status, 422);
});

Deno.test("iniciar: contaEmail que não é e-mail é 422", async () => {
  const { h } = montar();
  const r = await h(
    reqIniciar({ contaEmail: "não-é-email", driveId: "drive-1", pastaRaizItemId: "pasta-1" }),
  );
  assertEquals(r.status, 422);
});

Deno.test("iniciar: limite de uso é 429 com Retry-After, antes de autenticar", async () => {
  const { h } = montar({ limite: false });
  const r = await h(reqIniciar());
  assertEquals(r.status, 429);
  assertEquals(typeof r.headers.get("retry-after"), "string");
});

Deno.test(
  "iniciar: sucesso é 200 com { authorizeUrl } para o login.microsoftonline.com (PKCE S256) e cookie httpOnly",
  async () => {
    const { h } = montar();
    const r = await h(reqIniciar());
    assertEquals(r.status, 200);
    // JSON, não 302 bruto: fetch com redirect "manual" para redirecionamento cross-origin
    // devolve resposta opaca no browser — JS não leria o header Location (ver comentário em
    // _shared/onedrive-oauth.ts). O chamador (ConfiguracoesRealPage.tsx) lê authorizeUrl do
    // corpo e faz window.location.href ele mesmo.
    const corpo = (await r.json()) as { authorizeUrl: string };
    assertStringIncludes(
      corpo.authorizeUrl,
      "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize",
    );
    assertStringIncludes(corpo.authorizeUrl, "code_challenge_method=S256");
    assertStringIncludes(corpo.authorizeUrl, "scope=Files.ReadWrite+offline_access");
    assertStringIncludes(corpo.authorizeUrl, "client_id=client-de-teste");

    const setCookie = r.headers.get("set-cookie") ?? "";
    assertStringIncludes(setCookie, `${"akros_onedrive_oauth"}=`);
    assertStringIncludes(setCookie, "HttpOnly");
    assertStringIncludes(setCookie, "Secure");
    assertStringIncludes(setCookie, "SameSite=Lax");
    // Nenhum segredo (não há token nesta etapa, mas o cookie nunca deveria carregar client secret)
    assertEquals(setCookie.includes("client-de-teste"), false);
  },
);

Deno.test("iniciar: método diferente de GET/OPTIONS é 405", async () => {
  const { h } = montar();
  const r = await h(new Request("https://p.supabase.co/functions/v1/onedrive-oauth/iniciar", { method: "POST" }));
  assertEquals(r.status, 405);
});

Deno.test("OPTIONS responde 204 (preflight CORS), sem autenticar", async () => {
  const { h } = montar();
  const r = await h(new Request("https://p.supabase.co/functions/v1/onedrive-oauth/iniciar", { method: "OPTIONS" }));
  assertEquals(r.status, 204);
});

Deno.test("rota desconhecida é 404", async () => {
  const { h } = montar();
  const r = await h(new Request("https://p.supabase.co/functions/v1/onedrive-oauth/outra-coisa"));
  assertEquals(r.status, 404);
});

// ── /callback ────────────────────────────────────────────────────────────────────────────────

function cookieValido(stateQueDeveriaBater: string): string {
  return empacotarEstadoCookie({
    state: stateQueDeveriaBater,
    codeVerifier: "verifier-de-teste",
    userId: ADMIN_ID,
    contaEmail: "ops@akros.exemplo",
    driveId: "drive-1",
    pastaRaizItemId: "pasta-raiz-1",
  });
}

Deno.test("callback: cookie de estado ausente é 422, RPC/Vault nunca chamados", async () => {
  const { h, e } = montar();
  const r = await h(reqCallback({ state: "abc", code: "codigo-1" }));
  assertEquals(r.status, 422);
  assertEquals(e.trocarCodigoPorToken, 0);
  assertEquals(e.criarIntegracao, 0);
});

Deno.test("callback: state do parâmetro diverge do cookie é 422, RPC/Vault nunca chamados", async () => {
  const { h, e } = montar();
  const r = await h(reqCallback({ state: "state-diferente", code: "codigo-1" }, cookieValido("state-original")));
  assertEquals(r.status, 422);
  assertEquals(e.trocarCodigoPorToken, 0);
  assertEquals(e.criarIntegracao, 0);
});

Deno.test("callback: state ausente no parâmetro é 422", async () => {
  const { h, e } = montar();
  const r = await h(reqCallback({ code: "codigo-1" }, cookieValido("state-original")));
  assertEquals(r.status, 422);
  assertEquals(e.trocarCodigoPorToken, 0);
});

Deno.test("callback: code ausente é 422, troca de token nunca chamada", async () => {
  const { h, e } = montar();
  const r = await h(reqCallback({ state: "state-original" }, cookieValido("state-original")));
  assertEquals(r.status, 422);
  assertEquals(e.trocarCodigoPorToken, 0);
});

Deno.test(
  "callback: falha na troca código→token não cria linha em integracoes_microsoft nem segredo no Vault",
  async () => {
    const { h, e } = montar({ trocaFalha: true });
    const r = await h(reqCallback({ state: "state-original", code: "codigo-1" }, cookieValido("state-original")));
    assertEquals(r.status, 302);
    assertEquals(e.criarIntegracao, 0);
    assertEquals(e.salvarSegredoVault, 0);
    const location = r.headers.get("Location") ?? "";
    assertStringIncludes(location, "onedrive=erro");
    assertEquals(location.includes("refresh-token-fake"), false);
  },
);

Deno.test(
  "callback: sucesso grava segredo no Vault e a integração, e redireciona sem token no corpo nem no Location",
  async () => {
    const { h, e } = montar();
    const r = await h(reqCallback({ state: "state-original", code: "codigo-1" }, cookieValido("state-original")));
    assertEquals(r.status, 302);
    assertEquals(e.trocarCodigoPorToken, 1);
    assertEquals(e.salvarSegredoVault, 1);
    assertEquals(e.criarIntegracao, 1);
    assertEquals(e.ultimaChamadaCriarIntegracao?.contaEmail, "ops@akros.exemplo");
    assertEquals(e.ultimaChamadaCriarIntegracao?.conectadoPor, ADMIN_ID);

    const location = r.headers.get("Location") ?? "";
    assertStringIncludes(location, "onedrive=conectado");
    assertEquals(location.includes("refresh-token-fake"), false);
    assertEquals(location.includes("access-token-fake"), false);

    const corpo = await r.text();
    assertEquals(corpo, "");
    assertEquals(corpo.includes("refresh-token-fake"), false);
  },
);

Deno.test("callback: cookie de estado é limpo na resposta (sucesso e falha)", async () => {
  const sucesso = montar();
  const rSucesso = await sucesso.h(
    reqCallback({ state: "state-original", code: "codigo-1" }, cookieValido("state-original")),
  );
  assertEquals(typeof rSucesso.headers.get("set-cookie"), "string");

  const falha = montar({ trocaFalha: true });
  const rFalha = await falha.h(
    reqCallback({ state: "state-original", code: "codigo-1" }, cookieValido("state-original")),
  );
  assertEquals(typeof rFalha.headers.get("set-cookie"), "string");
});
