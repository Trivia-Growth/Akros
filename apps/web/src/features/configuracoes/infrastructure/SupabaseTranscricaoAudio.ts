import { getSupabase } from "@/shared/supabase/client";
import type { TranscricaoAudioPort } from "../application/ports";
import type {
  EntradaTranscricao,
  ProvedorTranscricao,
  TranscricaoAudio,
} from "../domain/transcricao";
import { erroDaFuncao } from "./SupabaseEvolutionCanal";

interface LinhaTranscricao {
  provedor: ProvedorTranscricao;
  modelo: string;
  idioma: string | null;
  indicio: string;
  ativa: boolean;
  aceite_envio_em: string | null;
  verificada_em: string | null;
}

export class SupabaseTranscricaoAudio implements TranscricaoAudioPort {
  private async invocar(corpo: Record<string, unknown>): Promise<void> {
    const { error } = await getSupabase().functions.invoke("canal-evolution", {
      headers: { "x-akros-csrf": "1" },
      body: corpo,
    });
    if (error) throw await erroDaFuncao(error);
  }

  async carregar(): Promise<TranscricaoAudio | null> {
    const { data, error } = await getSupabase()
      .schema("configuracoes")
      .from("transcricao_audio")
      .select("provedor,modelo,idioma,indicio,ativa,aceite_envio_em,verificada_em")
      .limit(1)
      .maybeSingle<LinhaTranscricao>();
    if (error) throw new Error("Não foi possível carregar a transcrição de áudio.");
    if (!data) return null;
    return {
      provedor: data.provedor,
      modelo: data.modelo,
      idioma: data.idioma,
      indicio: data.indicio,
      ativa: data.ativa,
      aceiteEnvioEm: data.aceite_envio_em,
      verificadaEm: data.verificada_em,
    };
  }

  salvar(entrada: EntradaTranscricao) {
    return this.invocar({
      acao: "salvar_transcricao",
      provedor: entrada.provedor,
      modelo: entrada.modelo,
      idioma: entrada.idioma,
      // Vazia = manter a chave guardada: o campo nem vai no corpo.
      ...(entrada.apiKey ? { apiKey: entrada.apiKey } : {}),
      aceiteEnvioDados: entrada.aceiteEnvioDados,
    });
  }

  testar() {
    return this.invocar({ acao: "testar_transcricao" });
  }

  definirAtiva(ativa: boolean) {
    return this.invocar({ acao: "definir_transcricao_ativa", ativa });
  }
}
