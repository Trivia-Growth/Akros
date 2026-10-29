// _shared/canal-transcricao.ts — ações administrativas da transcrição de áudio (E13-S15, ADR-0022),
// servidas por `canal-evolution` (mesma porta: admin-only, CSRF, rate limit, Zod `.strict()`).
// Liga é uma decisão do admin com DUAS provas: aceite de que o áudio sai do Akros para o provedor e
// chave+modelo verificados. Trocar provedor, modelo ou chave derruba as duas.
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { ErroCanal } from "./erro-canal.ts";
import {
  ErroTranscricao,
  IDIOMA_VALIDO,
  MODELO_VALIDO,
  type ProvedorTranscricao,
  verificarProvedor,
} from "./canais/transcricao.ts";
import { escopoTranscricao, type SegredoTranscricao } from "./segredos.ts";

export interface TranscricaoLinha {
  id: string;
  ativa: boolean;
  provedor: ProvedorTranscricao;
  modelo: string;
  idioma: string | null;
  indicio: string;
  aceite_envio_em: string | null;
  verificada_em: string | null;
}

export interface PatchTranscricao {
  provedor?: ProvedorTranscricao;
  modelo?: string;
  idioma?: string | null;
  indicio?: string;
  ativa?: boolean;
  aceite_envio_em?: string | null;
  aceite_envio_por?: string | null;
  verificada_em?: string | null;
  atualizado_por: string;
}

export interface DepsTranscricao {
  buscador: typeof fetch;
  agora(): Date;
  transcricao: {
    buscar(): Promise<TranscricaoLinha | null>;
    /** Insere a linha única se ainda não existe; senão atualiza. */
    salvar(patch: PatchTranscricao): Promise<TranscricaoLinha>;
  };
  segredos: {
    obter<T>(escopo: string): Promise<T | null>;
    salvar(escopo: string, valor: Record<string, string>): Promise<void>;
  };
}

const provedor = z.enum(["groq", "openrouter"]);

export const SalvarTranscricao = z.object({
  acao: z.literal("salvar_transcricao"),
  provedor,
  modelo: z.string().trim().regex(MODELO_VALIDO),
  idioma: z.string().trim().regex(IDIOMA_VALIDO).nullable(),
  /** Ausente = manter a chave guardada (só vale se o provedor não mudou). */
  apiKey: z.string().trim().min(8).max(2048).optional(),
  aceiteEnvioDados: z.boolean(),
}).strict();
export const TestarTranscricao = z.object({ acao: z.literal("testar_transcricao") }).strict();
export const DefinirTranscricaoAtiva = z.object({
  acao: z.literal("definir_transcricao_ativa"),
  ativa: z.boolean(),
}).strict();

const MENSAGEM: Record<string, [number, string]> = {
  chave_recusada: [502, "O provedor recusou a chave. Confira a chave de API."],
  modelo_indisponivel: [502, "O modelo não está disponível para esta chave. Escolha outro modelo."],
  limite_do_provedor: [502, "O provedor recusou por limite ou saldo. Tente de novo mais tarde."],
  tempo_esgotado: [502, "O provedor demorou demais para responder."],
  provedor_indisponivel: [502, "Não foi possível falar com o provedor de transcrição."],
  resposta_invalida: [502, "O provedor respondeu algo inesperado."],
};

/** Chave/modelo rejeitados de forma definitiva desligam a transcrição; indisponibilidade passageira, não. */
const DEFINITIVAS = new Set(["chave_recusada", "modelo_indisponivel"]);

export function criarHandlersTranscricao(d: DepsTranscricao) {
  async function carregar(): Promise<TranscricaoLinha> {
    const linha = await d.transcricao.buscar();
    if (!linha) throw new ErroCanal(409, "transcricao_nao_configurada", "Configure a transcrição de áudio primeiro.");
    return linha;
  }

  return {
    async salvar_transcricao(e: z.infer<typeof SalvarTranscricao>, userId: string) {
      const atual = await d.transcricao.buscar();
      const mudouProvedor = !!atual && atual.provedor !== e.provedor;
      if ((!atual || mudouProvedor) && !e.apiKey) {
        throw new ErroCanal(400, "chave_obrigatoria", "Informe a chave de API deste provedor.");
      }
      // O aceite vale para UM provedor: outro provedor é outra parte recebendo o áudio.
      const aceitoParaEste = !!atual && !mudouProvedor && !!atual.aceite_envio_em;
      if (!aceitoParaEste && !e.aceiteEnvioDados) {
        throw new ErroCanal(400, "aceite_obrigatorio", "Confirme que o áudio dos clientes será enviado ao provedor escolhido.");
      }
      const mudouProva = !atual || mudouProvedor || atual.modelo !== e.modelo || !!e.apiKey;
      const linha = await d.transcricao.salvar({
        provedor: e.provedor,
        modelo: e.modelo,
        idioma: e.idioma,
        indicio: e.apiKey ? e.apiKey.slice(-4) : atual?.indicio ?? "",
        ...(aceitoParaEste ? {} : { aceite_envio_em: d.agora().toISOString(), aceite_envio_por: userId }),
        ...(mudouProva ? { ativa: false, verificada_em: null } : {}),
        atualizado_por: userId,
      });
      // A linha (e seu id) existe ANTES do segredo, porque o escopo do Vault leva o id.
      if (e.apiKey) await d.segredos.salvar(escopoTranscricao(linha.id), { apiKey: e.apiKey });
      return {
        provedor: linha.provedor,
        modelo: linha.modelo,
        idioma: linha.idioma,
        indicio: linha.indicio,
        ativa: linha.ativa,
        verificada: linha.verificada_em !== null,
      };
    },

    /** Prova a chave e o modelo SEM gastar transcrição; a transcrição em si só um áudio real prova. */
    async testar_transcricao(_e: z.infer<typeof TestarTranscricao>, userId: string) {
      const atual = await carregar();
      const segredo = await d.segredos.obter<SegredoTranscricao>(escopoTranscricao(atual.id));
      if (!segredo?.apiKey) throw new ErroCanal(409, "chave_ausente", "Informe a chave de API antes de testar.");
      try {
        await verificarProvedor({ buscador: d.buscador, provedor: atual.provedor, modelo: atual.modelo, chave: segredo.apiKey });
      } catch (erro) {
        const codigo = erro instanceof ErroTranscricao ? erro.codigo : "provedor_indisponivel";
        if (DEFINITIVAS.has(codigo)) {
          await d.transcricao.salvar({ ativa: false, verificada_em: null, atualizado_por: userId });
        }
        const [status, mensagem] = MENSAGEM[codigo] ?? [502, "O provedor respondeu algo inesperado."];
        throw new ErroCanal(status, codigo, mensagem);
      }
      // Alguém pode ter trocado provedor, modelo ou chave durante a chamada: a prova valeria para a
      // configuração ANTIGA. Só carimba se nada mudou (o indício muda quando a chave muda).
      const agora = await d.transcricao.buscar();
      if (!agora || agora.provedor !== atual.provedor || agora.modelo !== atual.modelo || agora.indicio !== atual.indicio) {
        throw new ErroCanal(409, "conflito_configuracao", "A configuração mudou durante o teste. Teste de novo.");
      }
      await d.transcricao.salvar({ verificada_em: d.agora().toISOString(), atualizado_por: userId });
      return { verificada: true as const };
    },

    async definir_transcricao_ativa(e: z.infer<typeof DefinirTranscricaoAtiva>, userId: string) {
      const atual = await carregar();
      if (e.ativa && (!atual.aceite_envio_em || !atual.verificada_em)) {
        throw new ErroCanal(409, "transcricao_nao_verificada", "Teste a chave e o modelo antes de ligar a transcrição.");
      }
      await d.transcricao.salvar({ ativa: e.ativa, atualizado_por: userId });
      return { ativa: e.ativa };
    },
  };
}
