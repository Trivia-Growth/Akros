// onedrive-oauth — E03-S07 Fase 5 (T054, ADR-0019). GET /iniciar e GET /callback: conecta a conta
// corporativa Microsoft (admin-only), sem nunca devolver token ao browser. Toda a decisão vive em
// `_shared/onedrive-oauth.ts` (mesmo padrão de `caso-comandos`); este arquivo só lê a config de
// ambiente e monta os adapters reais.
//
// MICROSOFT_CLIENT_ID/MICROSOFT_CLIENT_SECRET: credenciais do app registration no Azure AD —
// não existem neste sandbox (ver "Honestidade obrigatória" no relatório desta task). Em produção
// seriam segredos de ambiente da função (Supabase secrets), nunca do Vault por tenant: são UMA
// credencial de aplicação, não um segredo por integração (o que vai ao Vault é só o refresh token
// de CADA integração conectada, escopo `microsoft-graph:<integracaoId>`).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { criarIOGraphMicrosoftReal } from "../_shared/graph-microsoft.ts";
import { clienteServico, salvarSegredo } from "../_shared/integracoes.ts";
import { criarManipuladorOnedriveOauth, type IOOnedriveOauth } from "../_shared/onedrive-oauth.ts";
import { TETOS, checarLimite } from "../_shared/rate-limit.ts";

const FN = "onedrive-oauth";

const CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET") ?? "";
// "organizations" (contas corporativas/educacionais, qualquer tenant) é o valor seguro por
// padrão para uma conta delegada sem tenant fixo — troca para um tenant id específico via env
// quando a política da Akros exigir (ver ADR-0019, "se a política do tenant exigir...").
const TENANT_ID = Deno.env.get("MICROSOFT_TENANT_ID") ?? "organizations";
const REDIRECT_URI_CALLBACK =
  Deno.env.get("MICROSOFT_REDIRECT_URI") ??
  `${Deno.env.get("SUPABASE_URL") ?? ""}/functions/v1/onedrive-oauth/callback`;
const FRONTEND_RETORNO_URL = Deno.env.get("ADMIN_CONFIGURACOES_URL") ?? "/admin/configuracoes";

const graphReal = criarIOGraphMicrosoftReal({
  tenantId: TENANT_ID,
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
});

const io: IOOnedriveOauth = {
  limite: (req) => checarLimite({ req, rota: FN, ...TETOS[FN] }),
  autenticarAdmin: (req) => requireAdmin(req),
  graph: { trocarCodigoPorToken: (params) => graphReal.trocarCodigoPorToken(params) },
  salvarSegredoVault: (escopo, valor) => salvarSegredo(clienteServico(), escopo, valor),
  criarIntegracao: async (params) => {
    const { error } = await clienteServico()
      .schema("arquivos")
      .from("integracoes_microsoft")
      .insert({
        id: params.id,
        conta_email: params.contaEmail,
        tenant_id: params.tenantId,
        drive_id: params.driveId,
        pasta_raiz_item_id: params.pastaRaizItemId,
        escopos: params.escopos,
        estado: "conectada",
        conectado_por: params.conectadoPor,
      });
    if (error) throw new Error("falha ao gravar integração Microsoft");
  },
};

serve(
  criarManipuladorOnedriveOauth(io, {
    clientId: CLIENT_ID,
    tenantId: TENANT_ID,
    redirectUriCallback: REDIRECT_URI_CALLBACK,
    frontendRetornoUrl: FRONTEND_RETORNO_URL,
  }),
);
