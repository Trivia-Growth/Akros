import { getSupabase } from "@/shared/supabase/client";
import type { EvolutionCanalPort } from "../application/ports";
import {
  type CanalEvolution,
  type CompatibilidadeEvolution,
  type DadosEvolution,
  ErroCanalEvolution,
  type EstadoConexao,
  type ResultadoEstado,
  type ResultadoServidor,
  type ServidorEvolution,
} from "../domain/evolution";

interface LinhaServidor {
  url_base: string;
  versao_detectada: string | null;
  estado: ServidorEvolution["estado"];
  motivo: string | null;
  indicio: string;
}

interface LinhaCompat {
  versao: string;
  capacidades: string[];
  afetada_logout: boolean;
  evidencia: string;
}

interface LinhaCanal {
  id: string;
  nome_exibicao: string;
  identificador: string;
  ativa: boolean;
  estado_conexao: EstadoConexao;
  ultimo_erro_codigo: string | null;
  aceite_risco_em: string | null;
}

/**
 * Erro de verdade de uma Edge Function: o SDK só expõe "non-2xx"; `{ erro, codigo }` está no corpo
 * da resposta (`error.context`). O código vira texto traduzido na tela.
 */
export async function erroDaFuncao(error: unknown): Promise<ErroCanalEvolution> {
  const contexto = (error as { context?: Response })?.context;
  if (contexto && typeof contexto.clone === "function") {
    try {
      const corpo = await contexto.clone().json();
      if (typeof corpo?.erro === "string") {
        return new ErroCanalEvolution(
          typeof corpo.codigo === "string" ? corpo.codigo : "erro",
          corpo.erro,
        );
      }
    } catch {
      // corpo não era JSON
    }
  }
  return new ErroCanalEvolution(
    "erro",
    error instanceof Error ? error.message : "Falha na chamada.",
  );
}

export class SupabaseEvolutionCanal implements EvolutionCanalPort {
  private async invocar<T>(corpo: Record<string, unknown>): Promise<T> {
    const { data, error } = await getSupabase().functions.invoke("canal-evolution", {
      headers: { "x-akros-csrf": "1" },
      body: corpo,
    });
    if (error) throw await erroDaFuncao(error);
    return (data ?? {}) as T;
  }

  async carregar(): Promise<DadosEvolution> {
    const config = () => getSupabase().schema("configuracoes");
    const [servidor, compat, canais] = await Promise.all([
      config()
        .from("evolution_servidor")
        .select("url_base,versao_detectada,estado,motivo,indicio")
        .limit(1)
        .maybeSingle<LinhaServidor>(),
      config()
        .from("evolution_compatibilidade")
        .select("versao,capacidades,afetada_logout,evidencia")
        .order("versao"),
      config()
        .from("contas_canal")
        .select(
          "id,nome_exibicao,identificador,ativa,estado_conexao,ultimo_erro_codigo,aceite_risco_em",
        )
        .eq("provedor", "evolution")
        .is("deleted_at", null)
        .order("created_at"),
    ]);
    if (servidor.error || compat.error || canais.error) {
      throw new Error("Não foi possível carregar o canal Evolution.");
    }
    return {
      servidor: servidor.data
        ? {
            urlBase: servidor.data.url_base,
            versao: servidor.data.versao_detectada,
            estado: servidor.data.estado,
            motivo: servidor.data.motivo,
            indicio: servidor.data.indicio,
          }
        : null,
      compatibilidade: ((compat.data ?? []) as LinhaCompat[]).map(
        (l): CompatibilidadeEvolution => ({
          versao: l.versao,
          capacidades: l.capacidades,
          afetadaLogout: l.afetada_logout,
          evidencia: l.evidencia,
        }),
      ),
      canais: ((canais.data ?? []) as LinhaCanal[]).map(
        (l): CanalEvolution => ({
          id: l.id,
          nomeExibicao: l.nome_exibicao,
          numero: l.identificador,
          ativa: l.ativa,
          estadoConexao: l.estado_conexao,
          ultimoErroCodigo: l.ultimo_erro_codigo,
          aceiteRiscoEm: l.aceite_risco_em,
        }),
      ),
    };
  }

  salvarServidor(urlBase: string, apiKey: string) {
    return this.invocar<ResultadoServidor>({ acao: "salvar_servidor", urlBase, apiKey });
  }

  registrarCompatibilidade(entrada: {
    versao: string;
    capacidades: string[];
    afetadaLogout: boolean;
    evidencia: string;
  }) {
    return this.invocar<{ compativel: boolean }>({ acao: "registrar_compatibilidade", ...entrada });
  }

  criarCanal(nomeExibicao: string, numero: string) {
    return this.invocar<{ contaId: string }>({ acao: "criar_canal", nomeExibicao, numero });
  }

  async criarInstancia(contaId: string) {
    await this.invocar({ acao: "criar_instancia", contaId });
  }

  async instalarWebhook(contaId: string) {
    await this.invocar({ acao: "instalar_webhook", contaId });
  }

  async aceitarRisco(contaId: string) {
    await this.invocar({ acao: "aceitar_risco", contaId });
  }

  gerarQr(contaId: string) {
    return this.invocar<{ qrBase64: string; expiraEm: string }>({ acao: "gerar_qr", contaId });
  }

  consultarEstado(contaId: string) {
    return this.invocar<ResultadoEstado>({ acao: "consultar_estado", contaId });
  }

  async enviarTeste(contaId: string, numero: string) {
    await this.invocar({ acao: "enviar_teste", contaId, numero });
  }

  async definirAtiva(contaId: string, ativa: boolean) {
    await this.invocar({ acao: "definir_ativa", contaId, ativa });
  }

  async vincularAgente(contaId: string, agenteId: string) {
    await this.invocar({ acao: "vincular_agente", contaId, agenteId });
  }
}
