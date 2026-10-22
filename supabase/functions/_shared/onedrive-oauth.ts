// _shared/onedrive-oauth.ts — lógica da Edge Function `onedrive-oauth` (E03-S07, Fase 5, T054,
// ADR-0019). Mesmo padrão porta/adapter de `_shared/caso-comandos.ts`: toda a decisão mora aqui,
// testável com um fake de `IOOnedriveOauth`; `onedrive-oauth/index.ts` só monta o adapter real
// (`requireAdmin`, `clienteServico()`, `criarIOGraphMicrosoftReal()`) e despacha por `serve()`.
// Nenhum teste deste arquivo toca rede nem Postgres real — ver "Honestidade obrigatória" no
// brief desta task: este sandbox não tem app registration real no Azure AD nem tenant Microsoft.
//
// Decisão de implementação (registrada também em tasks.md, "Decisões de implementação"):
// `IOGraphMicrosoft` (brief, contrato fixado e compartilhado com `vincular_pasta`/T056 e, em
// outra frente, `arquivo-processar`) não tem um método "ler e-mail/drive da conta" — o escopo
// delegado concedido (`Files.ReadWrite offline_access`) nem pede `openid`/`profile` para haver um
// ID token com e-mail. `contaEmail`/`driveId`/`pastaRaizItemId` não têm de onde vir de uma
// chamada ao Graph dentro de `/callback`: são informados pelo admin no formulário de conexão
// (T058, cartão "Conta Microsoft / OneDrive") e atravessam o fluxo efêmero de OAuth dentro do
// MESMO cookie de `state`+PKCE — mesmo critério de "dado efêmero de um fluxo de login", nunca
// tabela (ver ADR-0019). Nunca são tratados como prova de identidade: a única garantia de
// autoridade é `requireAdmin` em `/iniciar`; `/callback` não teria como reafirmá-la (o
// redirecionamento da Microsoft é navegação cross-site de topo, não carrega Bearer do Supabase —
// ver comentário em `supabase/config.toml`, `[functions.onedrive-oauth]`).
//
// Segunda decisão: `/iniciar` devolve 200 com `{ authorizeUrl }` no corpo, NÃO um 302 bruto.
// Achado empírico: `fetch` com `redirect: "manual"` para um redirecionamento CROSS-ORIGIN (a API
// do projeto Supabase é origem diferente do front-end) devolve uma resposta opaca no browser —
// JS não consegue ler o header `Location` dela. `/iniciar` só pode ser chamado por `fetch`
// (precisa do header `x-akros-csrf` e do Bearer do admin, nenhum dos dois cabe numa navegação de
// topo comum), então um 302 de verdade nunca seria lido por quem chama. O cartão (T058,
// `ConfiguracoesRealPage.tsx`) lê `authorizeUrl` do corpo e faz `window.location.href` ele mesmo.
// `/callback` é diferente: a Microsoft redireciona o browser de verdade (navegação de topo, não
// `fetch`), onde um 302 funciona normalmente — por isso só `/callback` devolve 302 bruto.
import { deleteCookie, getCookies, setCookie } from "https://deno.land/std@0.224.0/http/cookie.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { HttpError } from "./auth.ts";
import { corsHeaders } from "./cors.ts";
import { requireCsrfHeader } from "./csrf.ts";
import type { IOGraphMicrosoft } from "./graph-microsoft.ts";

const FN = "onedrive-oauth";
export const COOKIE_NOME = "akros_onedrive_oauth";
const COOKIE_TTL_SEGUNDOS = 600; // 10 min — dado efêmero de UM fluxo de login, nunca mais.
export const ESCOPOS_ONEDRIVE = ["Files.ReadWrite", "offline_access"];

const IniciarQuerySchema = z.object({
  contaEmail: z.string().email(),
  driveId: z.string().min(1),
  pastaRaizItemId: z.string().min(1),
});

interface EstadoCookie {
  state: string;
  codeVerifier: string;
  userId: string;
  contaEmail: string;
  driveId: string;
  pastaRaizItemId: string;
}

export interface OnedriveOauthConfig {
  clientId: string;
  /** "organizations"/"common" (multi-tenant) ou um tenant id específico — ver onedrive-oauth/index.ts. */
  tenantId: string;
  redirectUriCallback: string;
  /** URL do admin para onde o navegador volta após `/callback` (sucesso ou erro) — nunca carrega token. */
  frontendRetornoUrl: string;
}

export interface IOOnedriveOauth {
  limite(req: Request): Promise<{ permitido: boolean; reiniciaEm: Date | null }>;
  /** Lança HttpError 401/403 se não for admin autenticado — nunca lê userId do body/query. */
  autenticarAdmin(req: Request): Promise<{ userId: string }>;
  graph: Pick<IOGraphMicrosoft, "trocarCodigoPorToken">;
  /** Vault, escopo `microsoft-graph:<integracaoId>` (migration 0025) — via
   *  `configuracoes.salvar_segredo_integracao`, nunca um segundo mecanismo de cofre. */
  salvarSegredoVault(escopo: string, valor: Record<string, string>): Promise<void>;
  criarIntegracao(params: {
    id: string;
    contaEmail: string;
    tenantId: string | null;
    driveId: string;
    pastaRaizItemId: string;
    escopos: string[];
    conectadoPor: string;
  }): Promise<void>;
}

function base64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlParaTexto(valor: string): string {
  const normalizado = valor.replaceAll("-", "+").replaceAll("_", "/");
  const comPadding = normalizado + "=".repeat((4 - (normalizado.length % 4)) % 4);
  const binario = atob(comPadding);
  const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function sha256Base64Url(texto: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return base64Url(new Uint8Array(digest));
}

function gerarCodeVerifier(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

function gerarState(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(16)));
}

/** Exportado só para o teste montar um cookie de estado válido sem reimplementar a codificação. */
export function empacotarEstadoCookie(estado: EstadoCookie): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(estado)));
}

function desempacotarEstadoCookie(valor: string): EstadoCookie | null {
  try {
    return JSON.parse(base64UrlParaTexto(valor)) as EstadoCookie;
  } catch {
    return null;
  }
}

function json(corpo: unknown, status: number, cors: Record<string, string>, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "Content-Type": "application/json", ...extra },
  });
}

export function criarManipuladorOnedriveOauth(io: IOOnedriveOauth, config: OnedriveOauthConfig) {
  return async (req: Request): Promise<Response> => {
    const cors = corsHeaders(req.headers.get("Origin"));
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "GET") return new Response(null, { status: 405, headers: cors });

    // Fail-closed, antes de qualquer outra coisa — mesmo critério de caso-comandos: conectar/
    // reconectar é ação rara de admin, mas sem o limitador o endpoint fica com teto infinito.
    const limite = await io.limite(req);
    if (!limite.permitido) {
      const segundos = limite.reiniciaEm
        ? Math.max(1, Math.ceil((limite.reiniciaEm.getTime() - Date.now()) / 1000))
        : 60;
      return json({ erro: "Muitas requisições. Tente de novo em instantes." }, 429, cors, {
        "Retry-After": String(segundos),
      });
    }

    const url = new URL(req.url);
    try {
      if (url.pathname.endsWith("/iniciar")) return await iniciar(req, url, io, config, cors);
      if (url.pathname.endsWith("/callback")) return await callback(req, url, io, config, cors);
      return new Response(null, { status: 404, headers: cors });
    } catch (erro) {
      if (erro instanceof HttpError) return json({ erro: erro.message }, erro.status, cors);
      console.warn(JSON.stringify({ ts: new Date().toISOString(), nivel: "warn", fn: FN, msg: "falha" }));
      return json({ erro: "Não foi possível concluir agora." }, 500, cors);
    }
  };
}

async function iniciar(
  req: Request,
  url: URL,
  io: IOOnedriveOauth,
  config: OnedriveOauthConfig,
  cors: Record<string, string>,
): Promise<Response> {
  // Mesma posição 2-por-2 de caso-comandos: CSRF antes de autenticar, mesmo critério já
  // estabelecido no repositório para endpoint admin autenticado por Bearer token.
  requireCsrfHeader(req);
  const { userId } = await io.autenticarAdmin(req);

  const parsed = IniciarQuerySchema.safeParse({
    contaEmail: url.searchParams.get("contaEmail") ?? "",
    driveId: url.searchParams.get("driveId") ?? "",
    pastaRaizItemId: url.searchParams.get("pastaRaizItemId") ?? "",
  });
  if (!parsed.success) throw new HttpError(422, "Dados inválidos para iniciar a conexão");

  const state = gerarState();
  const codeVerifier = gerarCodeVerifier();
  const codeChallenge = await sha256Base64Url(codeVerifier);

  const estado: EstadoCookie = {
    state,
    codeVerifier,
    userId,
    contaEmail: parsed.data.contaEmail,
    driveId: parsed.data.driveId,
    pastaRaizItemId: parsed.data.pastaRaizItemId,
  };

  const headers = new Headers(cors);
  setCookie(headers, {
    name: COOKIE_NOME,
    value: empacotarEstadoCookie(estado),
    httpOnly: true,
    secure: true,
    // Lax, não Strict: o retorno da Microsoft em /callback é navegação cross-site de TOPO —
    // Strict não enviaria o cookie de volta e /callback nunca veria o state para validar.
    sameSite: "Lax",
    path: "/",
    maxAge: COOKIE_TTL_SEGUNDOS,
  });

  const authorizeUrl = new URL(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`);
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUriCallback);
  authorizeUrl.searchParams.set("response_mode", "query");
  authorizeUrl.searchParams.set("scope", ESCOPOS_ONEDRIVE.join(" "));
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  // Decisão de implementação (registrada também em tasks.md): corpo JSON com a URL, NÃO um 302
  // bruto. `fetch` com `redirect: "manual"` para um redirecionamento CROSS-ORIGIN devolve uma
  // resposta opaca no browser — JS não consegue ler o header `Location` dela (limitação de
  // `fetch`, não bug deste código). `/iniciar` é sempre chamado via `fetch` (precisa do header
  // `x-akros-csrf` e do Bearer, nenhum dos dois cabe numa navegação de topo comum); o chamador
  // (T058, `ConfiguracoesRealPage.tsx`) lê `authorizeUrl` do corpo e faz
  // `window.location.href = authorizeUrl` ele mesmo. `/callback`, abaixo, é diferente: a
  // Microsoft redireciona o browser de verdade (navegação de topo, não `fetch`), onde um 302
  // funciona normalmente — por isso só `/callback` devolve 302 bruto.
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify({ authorizeUrl: authorizeUrl.toString() }), {
    status: 200,
    headers,
  });
}

async function callback(
  req: Request,
  url: URL,
  io: IOOnedriveOauth,
  config: OnedriveOauthConfig,
  cors: Record<string, string>,
): Promise<Response> {
  const cookies = getCookies(req.headers);
  const bruto = cookies[COOKIE_NOME];
  const estado = bruto ? desempacotarEstadoCookie(bruto) : null;
  const stateRecebido = url.searchParams.get("state");
  const code = url.searchParams.get("code");

  // state ausente/inválido (cookie ausente, corrompido, ou divergente do parâmetro devolvido
  // pela Microsoft) é recusado ANTES de qualquer chamada à Microsoft — T055.
  if (!estado || !stateRecebido || estado.state !== stateRecebido) {
    const headers = new Headers(cors);
    headers.set("Content-Type", "application/json");
    deleteCookie(headers, COOKIE_NOME, { path: "/" });
    return new Response(JSON.stringify({ erro: "Estado inválido ou expirado. Tente conectar de novo." }), {
      status: 422,
      headers,
    });
  }

  if (!code) {
    const headers = new Headers(cors);
    headers.set("Content-Type", "application/json");
    deleteCookie(headers, COOKIE_NOME, { path: "/" });
    return new Response(JSON.stringify({ erro: "Código de autorização ausente" }), { status: 422, headers });
  }

  let tokens: { accessToken: string; refreshToken: string; expiraEm: number };
  try {
    tokens = await io.graph.trocarCodigoPorToken({
      code,
      redirectUri: config.redirectUriCallback,
      codeVerifier: estado.codeVerifier,
    });
  } catch {
    // Falha na troca código→token NUNCA cria linha em arquivos.integracoes_microsoft — T055.
    // Nada do erro original (pode carregar detalhe da Microsoft) chega ao redirecionamento.
    const headers = new Headers(cors);
    deleteCookie(headers, COOKIE_NOME, { path: "/" });
    headers.set("Location", `${config.frontendRetornoUrl}?onedrive=erro`);
    return new Response(null, { status: 302, headers });
  }

  const integracaoId = crypto.randomUUID();
  // Vault primeiro, com o id já decidido em código (não em DEFAULT do Postgres): o escopo
  // `microsoft-graph:<integracaoId>` precisa do id antes do INSERT existir.
  await io.salvarSegredoVault(`microsoft-graph:${integracaoId}`, { refreshToken: tokens.refreshToken });
  await io.criarIntegracao({
    id: integracaoId,
    contaEmail: estado.contaEmail,
    tenantId: config.tenantId === "organizations" || config.tenantId === "common" ? null : config.tenantId,
    driveId: estado.driveId,
    pastaRaizItemId: estado.pastaRaizItemId,
    escopos: ESCOPOS_ONEDRIVE,
    conectadoPor: estado.userId,
  });

  // Resposta de sucesso: só um redirecionamento ao admin com uma flag — nunca o token, nem no
  // corpo (não há corpo) nem no header Location (só a URL fixa de retorno + "?onedrive=conectado").
  const headers = new Headers(cors);
  deleteCookie(headers, COOKIE_NOME, { path: "/" });
  headers.set("Location", `${config.frontendRetornoUrl}?onedrive=conectado`);
  return new Response(null, { status: 302, headers });
}
