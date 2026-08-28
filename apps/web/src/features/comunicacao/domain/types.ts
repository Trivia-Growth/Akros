export type CanalComunicacao = "whatsapp_oficial" | "evolution" | "instagram";
export type AutorMensagem = "cliente" | "agente_ia" | "humano";
export type TipoMensagem = "texto" | "imagem" | "audio" | "arquivo";

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
  /** E04-S14 — mídia rica no inbox. Ausente/"texto" = comportamento de sempre. */
  tipo?: TipoMensagem;
  /** Nome do arquivo/mídia (imagem, áudio gravado, anexo) — sem persistir binário, mesma regra do E02-S03. */
  midiaNome?: string;
  /** Presente só em tipo "audio". */
  duracaoSegundos?: number;
  /** Preenchido quando o admin clica "Transcrever" num áudio. */
  transcricao?: string;
  /**
   * Fixture-only (mock): transcrição que "Transcrever" revela — mesma disciplina determinística
   * do `Documento.metadadosFixture` (E07-S01). Um adapter real de voz-pra-texto não usaria isto.
   */
  metadadosFixture?: { transcricaoSimulada?: string };
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
  /** Ids de ContaConectada (features/configuracoes, escopo "agenda") que este agente pode usar. */
  contasAgendaIds: string[];
}

/**
 * E-mail unificado (E04-S12) — mesmo padrão do WhatsApp: storage próprio, fundido na timeline só
 * na leitura (ver `useTimeline`). Uma EmailThread pertence a uma ContaConectada com escopo "email".
 */
export interface EmailMensagem {
  id: string;
  de: string;
  deNome?: string;
  corpo: string;
  recebidoEm: string;
  direcao: "entrada" | "saida";
  lida: boolean;
  anexoNome?: string;
}

export interface EmailThread {
  id: string;
  /** Id de ContaConectada (features/configuracoes, escopo "email") que recebeu esta thread. */
  contaEmailId: string;
  /** Vínculo com o cliente/lead, quando o remetente casa com um e-mail cadastrado. */
  clienteOuLeadId?: string;
  clienteNome?: string;
  assunto: string;
  mensagens: EmailMensagem[];
}

/** Correção explícita registrada pra evitar que o agente repita um comportamento (E04-S09). */
export interface CorrecaoAgente {
  id: string;
  texto: string;
  registradoEm: string;
}

/**
 * E04-S15 — BYOK por agente (ARCHITECTURE.md: "Gestão de agentes... BYOK por provedor LLM").
 * Chave nunca é devolvida em claro pro front — mesma regra do resto de Configurações
 * (`IntegracaoExterna.segredoFinal`). Modelo real de voz-pra-texto fica na integração global
 * "Whisper" (Configurações → categoria transcrição), não aqui — é utilidade do canal, não do agente.
 */
export type ProvedorLLM = "openrouter";

export interface ConfiguracaoLLM {
  provedor: ProvedorLLM;
  modelo: string;
  apiKeyConfigurada: boolean;
  apiKeyFinal?: string;
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
  /** BYOK: cada agente tem sua própria chave/modelo — nunca compartilhado entre agentes. */
  llm?: ConfiguracaoLLM;
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
