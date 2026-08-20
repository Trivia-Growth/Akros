export type CanalComunicacao = "whatsapp_oficial" | "evolution" | "instagram";
export type AutorMensagem = "cliente" | "agente_ia" | "humano";

/**
 * Timeline unificada (E08-S01 / ADR-0006). Absorve o antigo `Interacao` do CRM.
 * `Conversa`/`Mensagem` (inbox do WhatsApp, E04-S01) continuam existindo como storage próprio —
 * a unificação acontece na leitura: `useTimelineCliente` (application/hooks.ts) funde
 * eventosComunicacao + mensagens de Conversa num só fluxo cronológico, sem migrar o inbox.
 */
export type CanalEvento = "whatsapp" | "email" | "chat_portal" | "reuniao" | "sistema";
export type DirecaoEvento = "entrada" | "saida" | "interno";

export interface AnexoEvento {
  nome: string;
  documentoId?: string;
}

export interface EventoComunicacao {
  id: string;
  clienteOuLeadId: string;
  canal: CanalEvento;
  direcao: DirecaoEvento;
  autor: string;
  conteudo: string;
  anexos?: AnexoEvento[];
  ocorridoEm: string;
  origemId?: string;
  /** E08-S03: anexo chegou por um canal não-registrável (WhatsApp) e aguarda reenvio formal. */
  pendenteDeCanal?: boolean;
}

export interface Mensagem {
  id: string;
  autor: AutorMensagem;
  texto: string;
  enviadoEm: string;
  lida: boolean;
}

export interface Conversa {
  id: string;
  clienteId: string;
  clienteNome: string;
  canal: CanalComunicacao;
  mensagens: Mensagem[];
  atendidoPorIA: boolean;
  /** Custo acumulado (USD) do atendimento por IA nesta conversa. Só presente quando atendidoPorIA. */
  custoIA?: number;
}

/** Tool de agendamento direto (ADR-0007) — separada do mcp-calendar (só leitura). */
export interface FerramentaAgendamento {
  ativa: boolean;
  /** Ids de ContaAgendaConectada (features/configuracoes) que este agente pode usar. */
  contasAgendaIds: string[];
}

/** Correção explícita registrada pra evitar que o agente repita um comportamento (E04-S09). */
export interface CorrecaoAgente {
  id: string;
  texto: string;
  registradoEm: string;
}

export interface RegraAtendimentoIA {
  id: string;
  ativo: boolean;
  nomeAgente: string;
  funcao: string;
  /** Ids de ContaCanalConectada (features/configuracoes) que este agente atende (E04-S11). */
  contasCanalIds: string[];
  alma: string;
  saudacao: string;
  janelasAtendimento: { inicio: string; fim: string }[];
  topicos: { pergunta: string; resposta: string }[];
  mensagemHandoff: string;
  /** Ids de FonteConhecimento no catálogo compartilhado (E04-S10). */
  baseConhecimentoIds: string[];
  correcoes: CorrecaoAgente[];
  memoria: ConfiguracaoMemoria;
  ferramentaAgendamento?: FerramentaAgendamento;
}

export interface FonteConhecimento {
  id: string;
  nome: string;
  tipo: "documento" | "url" | "faq" | "base_interna";
  status: "pronta" | "indexando";
  itens: number;
}

export interface ConfiguracaoMemoria {
  ativa: boolean;
  escopo: "por_cliente" | "por_conversa";
  retencao: string;
  campos: string[];
}
