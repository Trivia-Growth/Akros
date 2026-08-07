export type CanalComunicacao = "whatsapp_oficial" | "evolution";
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
}

export interface RegraAtendimentoIA {
  id: string;
  ativo: boolean;
  nomeAgente: string;
  funcao: string;
  canais: CanalComunicacao[];
  alma: string;
  saudacao: string;
  janelasAtendimento: { inicio: string; fim: string }[];
  topicos: { pergunta: string; resposta: string }[];
  mensagemHandoff: string;
  baseConhecimento: FonteConhecimento[];
  skills: SkillAgente[];
  mcps: ConectorMCP[];
  memoria: ConfiguracaoMemoria;
}

export interface FonteConhecimento {
  id: string;
  nome: string;
  tipo: "documento" | "url" | "faq" | "base_interna";
  status: "pronta" | "indexando";
  itens: number;
}

export interface SkillAgente {
  id: string;
  nome: string;
  descricao: string;
  ativa: boolean;
}

export interface ConectorMCP {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  permissao: "leitura" | "leitura_escrita";
}

export interface ConfiguracaoMemoria {
  ativa: boolean;
  escopo: "por_cliente" | "por_conversa";
  retencao: string;
  campos: string[];
}
