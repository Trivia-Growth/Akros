// _shared/io-canal-evolution.ts — E/S real de `canal-evolution` (E13-S15): Supabase com service_role,
// Vault via RPC e rede. Tudo que decide está em `canal-evolution.ts`; aqui só há encanamento.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "./auth.ts";
import type { ContaLinha, DepsCanalEvolution, ServidorLinha } from "./canal-evolution.ts";
import type { TranscricaoLinha } from "./canal-transcricao.ts";
import { resolverEnderecosPublicos, validarUrlServidor } from "./canais/evolution-url.ts";
import { corsHeaders } from "./cors.ts";
import { requireCsrfHeader } from "./csrf.ts";
import { clienteServico, obterSegredo, salvarSegredo, tokenAleatorio } from "./integracoes.ts";

const COLUNAS_CONTA =
  "id,provedor,nome_exibicao,identificador,ativa,estado_conexao,nome_instancia,aceite_risco_em,aceite_risco_por,ultimo_erro_codigo,credenciais_configuradas,deleted_at";
const COLUNAS_SERVIDOR = "id,url_base,versao_detectada,estado,motivo,indicio";
const COLUNAS_TRANSCRICAO = "id,ativa,provedor,modelo,idioma,indicio,aceite_envio_em,verificada_em";

export function criarDepsCanalEvolution(): Omit<DepsCanalEvolution, "limite"> {
  let cliente: SupabaseClient | null = null;
  // Criação preguiçosa: ambiente incompleto vira erro de requisição (500), não queda no boot.
  const sb = () => (cliente ??= clienteServico());
  const configuracoes = () => sb().schema("configuracoes");

  return {
    autenticarAdmin: requireAdmin,
    exigirCsrf: requireCsrfHeader,
    cors: corsHeaders,
    buscador: fetch,
    validarUrl: (url) => validarUrlServidor(url, { resolverEnderecos: resolverEnderecosPublicos }),
    urlProjeto: Deno.env.get("SUPABASE_URL") ?? "",
    gerarToken: tokenAleatorio,
    agora: () => new Date(),

    servidores: {
      async buscar() {
        const { data, error } = await configuracoes().from("evolution_servidor").select(COLUNAS_SERVIDOR).limit(1)
          .maybeSingle<ServidorLinha>();
        if (error) throw new Error("falha ao ler o servidor Evolution");
        return data;
      },
      async salvar(v) {
        const existente = await this.buscar();
        const linha = { ...v, updated_at: new Date().toISOString() };
        const q = existente
          ? configuracoes().from("evolution_servidor").update(linha).eq("id", existente.id)
          : configuracoes().from("evolution_servidor").insert(linha);
        const { data, error } = await q.select(COLUNAS_SERVIDOR).single<ServidorLinha>();
        if (error) throw new Error("falha ao gravar o servidor Evolution");
        return data;
      },
    },

    compat: {
      async buscar(versao) {
        const { data, error } = await configuracoes().from("evolution_compatibilidade")
          .select("capacidades,afetada_logout").eq("versao", versao)
          .maybeSingle<{ capacidades: string[]; afetada_logout: boolean }>();
        if (error) throw new Error("falha ao ler a matriz de compatibilidade");
        return data ? { capacidades: data.capacidades, afetadaLogout: data.afetada_logout } : null;
      },
      async salvar(v) {
        const { error } = await configuracoes().from("evolution_compatibilidade")
          .upsert({ ...v, updated_at: new Date().toISOString() }, { onConflict: "versao" });
        if (error) throw new Error("falha ao gravar a matriz de compatibilidade");
      },
    },

    contas: {
      async buscar(id) {
        const { data, error } = await configuracoes().from("contas_canal").select(COLUNAS_CONTA).eq("id", id)
          .maybeSingle<ContaLinha>();
        if (error) throw new Error("falha ao ler o canal");
        return data;
      },
      async buscarPorNumero(digitos) {
        const { data, error } = await configuracoes().from("contas_canal").select(COLUNAS_CONTA)
          .eq("provedor", "evolution").eq("identificador", digitos).is("deleted_at", null).limit(1)
          .maybeSingle<ContaLinha>();
        if (error) throw new Error("falha ao procurar o canal");
        return data;
      },
      async criar(v) {
        const { data, error } = await configuracoes().from("contas_canal").insert({
          provedor: "evolution",
          nome_exibicao: v.nome_exibicao,
          identificador: v.identificador,
          ativa: false,
          created_by: v.criada_por,
          updated_by: v.criada_por,
        }).select("id").single<{ id: string }>();
        if (error) throw new Error("falha ao criar o canal");
        return data.id;
      },
      async atualizar(id, patch) {
        const { error } = await configuracoes().from("contas_canal")
          .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw new Error("falha ao atualizar o canal");
      },
      async resetarEvolution(codigo) {
        const { error } = await configuracoes().from("contas_canal")
          .update({
            estado_conexao: "sem_credencial",
            ativa: false,
            credenciais_configuradas: false,
            ultimo_erro_codigo: codigo,
            updated_at: new Date().toISOString(),
          })
          .eq("provedor", "evolution").not("nome_instancia", "is", null);
        if (error) throw new Error("falha ao reiniciar os canais");
      },
    },

    segredos: {
      obter: <T>(escopo: string) => obterSegredo<T>(sb(), escopo),
      salvar: (escopo, valor) => salvarSegredo(sb(), escopo, valor),
    },

    transcricao: {
      async buscar() {
        const { data, error } = await configuracoes().from("transcricao_audio").select(COLUNAS_TRANSCRICAO).limit(1)
          .maybeSingle<TranscricaoLinha>();
        if (error) throw new Error("falha ao ler a transcrição de áudio");
        return data;
      },
      async salvar(patch) {
        const existente = await this.buscar();
        const linha = { ...patch, updated_at: new Date().toISOString() };
        const q = existente
          ? configuracoes().from("transcricao_audio").update(linha).eq("id", existente.id)
          : configuracoes().from("transcricao_audio").insert(linha);
        const { data, error } = await q.select(COLUNAS_TRANSCRICAO).single<TranscricaoLinha>();
        if (error) throw new Error("falha ao gravar a transcrição de áudio");
        return data;
      },
    },

    agentes: {
      async vincular(agenteId, contaId) {
        const tabela = () => sb().schema("comunicacao").from("regras_atendimento_ia");
        const { data, error } = await tabela().select("contas_canal_ids").eq("id", agenteId)
          .maybeSingle<{ contas_canal_ids: string[] | null }>();
        if (error) throw new Error("falha ao ler o agente");
        if (!data) return false;
        const ids = [...new Set([...(data.contas_canal_ids ?? []), contaId])];
        const { error: erroUpdate } = await tabela().update({ contas_canal_ids: ids, updated_at: new Date().toISOString() })
          .eq("id", agenteId);
        if (erroUpdate) throw new Error("falha ao vincular o agente");
        return true;
      },
    },
  };
}
