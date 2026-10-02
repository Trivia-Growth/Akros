// agente-playground — E13-S14. O administrador testa o agente sem canal e sem gravar nada.
// Toda a decisão vive em `_shared/playground.ts` e `_shared/agente.ts` (a mesma da produção).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireAdmin } from "../_shared/auth.ts";
import {
  clienteServico,
  escopoOpenRouter,
  obterSegredo,
  type SegredoOpenRouter,
} from "../_shared/integracoes.ts";
import { gerarRespostaOpenRouter, type RegraAgente } from "../_shared/openrouter.ts";
import { criarManipuladorPlayground } from "../_shared/playground.ts";
import { TETOS, checarLimite } from "../_shared/rate-limit.ts";

const FN = "agente-playground";

serve(criarManipuladorPlayground({
  limite: (req) => checarLimite({ req, rota: FN, ...TETOS[FN] }),
  autenticarAdmin: async (req) => {
    await requireAdmin(req);
  },
  carregarAgente: async (id) => {
    const { data, error } = await clienteServico()
      .schema("comunicacao")
      .from("regras_atendimento_ia")
      .select("id,nome_agente,funcao,alma,saudacao,mensagem_handoff,llm")
      .eq("id", id)
      .maybeSingle<RegraAgente>();
    if (error) throw new Error("falha ao carregar agente");
    return data;
  },
  deps: {
    chaveOpenRouter: async (agenteId) => {
      const segredo = await obterSegredo<SegredoOpenRouter>(clienteServico(), escopoOpenRouter(agenteId));
      return segredo?.apiKey || null;
    },
    gerarResposta: (regra, chave, historico) => gerarRespostaOpenRouter(fetch, regra, chave, historico),
  },
  agora: () => Date.now(),
}));
