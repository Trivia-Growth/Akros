// _shared/io-supabase.ts — E/S real dos webhooks de canal: Supabase com service_role, Vault via RPC,
// OpenRouter e rate limit. Tudo que decide está em `agente.ts`/`webhook-*.ts`; aqui só há encanamento.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { DepsAgente } from "./agente.ts";
import { resolverEnderecosPublicos, validarUrlServidor } from "./canais/evolution-url.ts";
import {
  clienteServico,
  escopoOpenRouter,
  escopoServidorEvolution,
  escopoTranscricao,
  obterSegredo,
  type SegredoOpenRouter,
  type SegredoServidorEvolution,
  type SegredoTranscricao,
} from "./integracoes.ts";
import { gerarRespostaOpenRouter, type RegraAgente } from "./openrouter.ts";
import type { ProvedorTranscricao } from "./canais/transcricao.ts";
import type { ContaCanal, IOEvolution, IOWebhook } from "./webhook.ts";

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
        .select("id,ativa,credenciais_configuradas,metadados_publicos,nome_instancia,estado_conexao,identificador")
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
            // Só vincula quando há EXATAMENTE um cliente com o telefone (E13-S15, FR-018).
            .rpc("obter_cliente_unico_por_telefone", { p_telefone: contatoExterno })
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
              p_tipo: entrada.tipo ?? "texto",
              p_anexo: entrada.anexo
                ? {
                  nome: entrada.anexo.nome,
                  mime: entrada.anexo.mime,
                  tamanhoBytes: entrada.anexo.tamanhoBytes,
                  baixado: entrada.anexo.baixado,
                  ...(entrada.anexo.caminho ? { caminho: entrada.anexo.caminho } : {}),
                  ...(entrada.anexo.motivo ? { motivo: entrada.anexo.motivo } : {}),
                  ...(entrada.anexo.transcricao ? { transcricao: entrada.anexo.transcricao } : {}),
                }
                : null,
              p_identificacao: entrada.identificacao ?? "identificada",
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

/** E/S do webhook da Evolution: a base + servidor compatível, estado da conexão e anexos (E13-S15). */
export function criarIOEvolution(): Omit<IOEvolution, "limite" | "limiteTranscricao"> {
  const base = criarIOSupabase();
  let cliente: SupabaseClient | null = null;
  const sb = () => (cliente ??= clienteServico());

  return {
    ...base,

    async servidorEvolution() {
      const { data, error } = await sb()
        .schema("configuracoes")
        .from("evolution_servidor")
        .select("id,url_base")
        .eq("estado", "compativel")
        .limit(1)
        .maybeSingle<{ id: string; url_base: string }>();
      if (error) throw new Error("falha ao carregar o servidor Evolution");
      if (!data) return null;
      const segredo = await obterSegredo<SegredoServidorEvolution>(sb(), escopoServidorEvolution(data.id));
      return segredo?.apiKey ? { urlBase: data.url_base, apiKey: segredo.apiKey } : null;
    },

    async atualizarConexao(contaId, estado, codigoErro) {
      const { error } = await sb()
        .schema("configuracoes")
        .from("contas_canal")
        .update({ estado_conexao: estado, ultimo_erro_codigo: codigoErro, updated_at: new Date().toISOString() })
        .eq("id", contaId);
      if (error) throw new Error("falha ao atualizar o estado da conexão");
    },

    async jaRecebida(contaId, origemId) {
      const { data, error } = await sb()
        .schema("comunicacao")
        .from("webhooks_canal")
        .select("id")
        .eq("conta_canal_id", contaId)
        .eq("origem_id", origemId)
        .limit(1)
        .maybeSingle();
      if (error) throw new Error("falha ao conferir recebimento");
      return data !== null;
    },

    async guardarAnexo({ contaId, origemId, bytes, mime }) {
      const caminho = `${contaId}/${origemId.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120)}`;
      const { error } = await sb().storage.from("comunicacao-anexos").upload(caminho, bytes, {
        contentType: mime,
        upsert: false,
      });
      // Mesmo caminho já gravado (reentrega que passou pela checagem): o arquivo certo já está lá.
      if (error && !/exists|duplicate/i.test(error.message)) throw new Error("falha ao guardar anexo");
      return caminho;
    },

    async validarUrl(url) {
      const r = await validarUrlServidor(url, { resolverEnderecos: resolverEnderecosPublicos });
      if (!r.valida) throw new Error("url_recusada");
    },

    async transcricao() {
      const { data, error } = await sb()
        .schema("configuracoes")
        .from("transcricao_audio")
        .select("id,provedor,modelo,idioma")
        .eq("ativa", true)
        .limit(1)
        .maybeSingle<{ id: string; provedor: ProvedorTranscricao; modelo: string; idioma: string | null }>();
      if (error) throw new Error("falha ao ler a transcrição de áudio");
      if (!data) return null;
      const segredo = await obterSegredo<SegredoTranscricao>(sb(), escopoTranscricao(data.id));
      return segredo?.apiKey
        ? { provedor: data.provedor, modelo: data.modelo, idioma: data.idioma, chave: segredo.apiKey }
        : null;
    },
  };
}
