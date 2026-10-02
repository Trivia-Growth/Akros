// _shared/io-supabase.ts — E/S real dos webhooks de canal: Supabase com service_role, Vault via RPC,
// OpenRouter e rate limit. Tudo que decide está em `agente.ts`/`webhook-*.ts`; aqui só há encanamento.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { DepsAgente } from "./agente.ts";
import { clienteServico, escopoOpenRouter, obterSegredo, type SegredoOpenRouter } from "./integracoes.ts";
import { gerarRespostaOpenRouter, type RegraAgente } from "./openrouter.ts";
import type { ContaCanal, IOWebhook } from "./webhook.ts";

// O teto de uso NÃO é montado aqui: cada `index.ts` chama `checarLimite` com o seu próprio teto, à
// vista, porque é o que `check-edge-functions` exige de toda função pública (E14-S01 AC-6).
export function criarIOSupabase(): Omit<IOWebhook, "limite"> {
  let cliente: SupabaseClient | null = null;
  // Criação preguiçosa: ambiente incompleto vira erro de requisição (500), não queda no boot.
  const sb = () => (cliente ??= clienteServico());

  return {
    buscador: fetch,

    async carregarConta(contaId, provedor) {
      const { data, error } = await sb()
        .schema("configuracoes")
        .from("contas_canal")
        .select("id,ativa,credenciais_configuradas,metadados_publicos")
        .eq("id", contaId)
        .eq("provedor", provedor)
        .is("deleted_at", null)
        .maybeSingle<ContaCanal>();
      if (error) throw new Error("falha ao carregar conta de canal");
      return data;
    },

    segredo: <T>(escopo: string) => obterSegredo<T>(sb(), escopo),

    criarDeps({ contaId, usaTelefone, enviar }): DepsAgente {
      return {
        async vincularCliente(contatoExterno) {
          if (!usaTelefone) return null;
          const { data, error } = await sb()
            .schema("crm")
            .rpc("obter_cliente_por_telefone", { p_telefone: contatoExterno })
            .maybeSingle<{ id: string; nome: string }>();
          if (error) throw new Error("falha ao localizar contato");
          return data;
        },

        async registrar({ clienteId, clienteNome, entrada }) {
          const { data, error } = await sb()
            .schema("comunicacao")
            .rpc("registrar_entrada_canal", {
              p_conta_canal_id: contaId,
              p_cliente_id: clienteId,
              p_cliente_nome: clienteNome,
              p_contato_externo: entrada.contatoExterno,
              p_origem_id: entrada.origemId,
              p_texto: entrada.texto,
              p_ocorrido_em: entrada.ocorridoEm,
            })
            .single<{ processar: boolean; conversa_id: string | null }>();
          if (error) throw new Error("falha ao registrar mensagem");
          return { processar: data.processar, conversaId: data.conversa_id };
        },

        async concluir({ conversaId, origemId, status, textoSaida, custo }) {
          const { error } = await sb().schema("comunicacao").rpc("concluir_entrada_canal", {
            p_conversa_id: conversaId,
            p_origem_id: origemId,
            p_status: status,
            p_saida_id: textoSaida ? `resposta:${origemId}` : null,
            p_texto_saida: textoSaida ?? null,
            p_custo: custo ?? null,
          });
          if (error) throw new Error("falha ao concluir recebimento");
        },

        async agenteDaConta() {
          const { data, error } = await sb()
            .schema("comunicacao")
            .from("regras_atendimento_ia")
            .select("id,nome_agente,funcao,alma,saudacao,mensagem_handoff,llm")
            .eq("ativo", true)
            .contains("contas_canal_ids", [contaId])
            .limit(1)
            .maybeSingle<RegraAgente>();
          if (error) throw new Error("falha ao localizar agente");
          return data;
        },

        async chaveOpenRouter(agenteId) {
          const segredo = await obterSegredo<SegredoOpenRouter>(sb(), escopoOpenRouter(agenteId));
          return segredo?.apiKey || null;
        },

        async historico(conversaId) {
          const { data, error } = await sb()
            .schema("comunicacao")
            .from("conversas")
            .select("mensagens")
            .eq("id", conversaId)
            .single<{ mensagens: unknown }>();
          if (error) throw new Error("falha ao montar contexto");
          return data.mensagens;
        },

        gerarResposta: (regra, chave, historico) =>
          gerarRespostaOpenRouter(fetch, regra, chave, historico),

        enviar,

        log: (evento) =>
          console.warn(JSON.stringify({ ts: new Date().toISOString(), contaId, ...evento })),
      };
    },
  };
}
