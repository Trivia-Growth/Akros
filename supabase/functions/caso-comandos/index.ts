// caso-comandos — E03-S07 (T031/T032, estendido em T046-T048 e T056). Edge Function de comando
// transacional desta feature: registrar_contrato, preparar_caso, convidar_participante,
// revogar_participante, solicitar_documento, vincular_pasta (ações futuras entram em
// _shared/caso-comandos.ts, não aqui). Toda a decisão vive em `_shared/caso-comandos.ts` (mesmo
// padrão de `agente-playground`/`_shared/playground.ts`); este arquivo só monta os adapters reais
// — `service_role` via `_shared/integracoes.ts`, idempotência via `_shared/io-supabase-caso.ts`,
// Microsoft Graph via `_shared/graph-microsoft.ts` (só usado por `vincular_pasta`, T056) — e
// despacha pelo `serve()`.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { criarManipuladorCasoComandos } from "../_shared/caso-comandos.ts";
import { executarCasoRpc } from "../_shared/caso-rpc.ts";
import { criarIOGraphMicrosoftReal } from "../_shared/graph-microsoft.ts";
import { clienteServico, obterSegredo, salvarSegredo } from "../_shared/integracoes.ts";
import { criarIOIdempotencia } from "../_shared/io-supabase-caso.ts";
import { TETOS, checarLimite } from "../_shared/rate-limit.ts";

const FN = "caso-comandos";

// Credenciais do app registration Microsoft (ver onedrive-oauth/index.ts — mesma env, mesmo
// critério: credencial de aplicação, não segredo por integração).
const graphReal = criarIOGraphMicrosoftReal({
  tenantId: Deno.env.get("MICROSOFT_TENANT_ID") ?? "organizations",
  clientId: Deno.env.get("MICROSOFT_CLIENT_ID") ?? "",
  clientSecret: Deno.env.get("MICROSOFT_CLIENT_SECRET") ?? "",
});

serve(
  criarManipuladorCasoComandos({
    limite: (req) => checarLimite({ req, rota: FN, ...TETOS[FN] }),
    autenticarAdmin: (req) => requireAdmin(req),
    idempotencia: criarIOIdempotencia(),
    rpc: (nome, params) => executarCasoRpc(clienteServico())(nome, params),
    graph: { listarAncestrais: (params) => graphReal.listarAncestrais(params) },
    // T056: lê a integração (drive/pasta raiz públicos), troca o refresh token do Vault por um
    // access token fresco e regrava o Vault se a Microsoft rotacionar o refresh token — nunca um
    // segundo mecanismo de cofre, mesma RPC de configuracoes.* reusada via obterSegredo/salvarSegredo.
    prepararAcessoMicrosoft: async (integracaoId) => {
      const supabase = clienteServico();
      const { data, error } = await supabase
        .schema("arquivos")
        .from("integracoes_microsoft")
        .select("drive_id,pasta_raiz_item_id")
        .eq("id", integracaoId)
        .maybeSingle<{ drive_id: string; pasta_raiz_item_id: string }>();
      if (error) throw new Error("falha ao consultar integração Microsoft");
      if (!data) return null;

      const segredo = await obterSegredo<{ refreshToken: string }>(
        supabase,
        `microsoft-graph:${integracaoId}`,
      );
      if (!segredo) return null;

      const tokens = await graphReal.trocarRefreshPorToken({ refreshToken: segredo.refreshToken });
      await salvarSegredo(supabase, `microsoft-graph:${integracaoId}`, {
        refreshToken: tokens.refreshToken,
      });

      return {
        accessToken: tokens.accessToken,
        driveId: data.drive_id,
        pastaRaizItemId: data.pasta_raiz_item_id,
      };
    },
  }),
);
