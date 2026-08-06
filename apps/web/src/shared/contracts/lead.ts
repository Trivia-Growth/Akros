/**
 * Contrato compartilhado entre os bounded contexts `site` (cria o Lead via formulário) e
 * `crm` (gerencia o Lead no kanban). Ver ARCHITECTURE.md — regra geral é features não se
 * importarem entre si; Lead é a exceção documentada por ser genuinamente cross-context nesta
 * fase (sem um workspace packages/ dedicado, shared/contracts cumpre esse papel).
 */
export type EstagioLead =
  | "lead"
  | "qualificado"
  | "reuniao_agendada"
  | "em_negociacao"
  | "fechado"
  | "descartado";

// --- E11-S02: perfil rico do lead --------------------------------------------------------

export type FormacaoLead = "medio" | "superior" | "pos" | "mestrado" | "doutorado";
export type FaixaBudget = "ate_15k" | "15k_30k" | "30k_50k" | "acima_50k" | "prefiro_nao_informar";
export type MomentoVida = "explorando" | "decidido_sem_prazo" | "decidido_com_prazo" | "urgente";
export type OrigemCampoPerfil = "informado_lead" | "inferido_bot" | "preenchido_equipe";

export interface PerfilLead {
  formacao?: FormacaoLead;
  anosExperiencia?: number;
  areaAtuacao?: string;
  faixaBudget?: FaixaBudget;
  momentoVida?: MomentoVida;
  prazoDesejado?: string;
  familia?: string;
  jaTeveVistoNegado?: boolean;
  estaNosEUA?: boolean;
  motivacao?: string;
  /** Preenchido no gate (E11-S04) ou na conversa — é o campo que torna a reativação possível. */
  objecaoPrincipal?: string;
}

// --- E11-S01: qualificação conversacional (mockada/fictícia) -----------------------------

export type StatusQualificacao = "nao_iniciada" | "em_andamento" | "concluida";

export interface EstadoQualificacao {
  status: StatusQualificacao;
  perguntaAtualIndex: number;
  respostas: Record<string, string>;
}

// --- E11-S03: cadência de follow-up -------------------------------------------------------

export type StatusCadencia = "inativa" | "ativa" | "pausada" | "encerrada";
export type MotivoEncerramentoCadencia =
  | "respondeu"
  | "esgotada"
  | "pausada_manual"
  | "desligada_manual";

export interface EstadoCadencia {
  status: StatusCadencia;
  /** 0 = nenhum toque enviado ainda; 1..4 = último toque enviado. */
  toqueAtual: number;
  proximoToqueEm?: string;
  motivoEncerramento?: MotivoEncerramentoCadencia;
}

// --- E11-S04: gate humano de agendamento --------------------------------------------------

export type StatusGateAgendamento = "pendente" | "aprovado" | "recusado";

export interface DecisaoGateAgendamento {
  status: StatusGateAgendamento;
  autor?: string;
  decididoEm?: string;
  motivoRecusa?: string;
}

export interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  origem: string;
  tipoVistoInteresse: string;
  areaProfissao?: string;
  mensagem?: string;
  estagio: EstagioLead;
  criadoEm: string;
  notas: string[];
  perfil?: PerfilLead;
  perfilOrigem?: Partial<Record<keyof PerfilLead, OrigemCampoPerfil>>;
  qualificacao?: EstadoQualificacao;
  cadencia?: EstadoCadencia;
  gateAgendamento?: DecisaoGateAgendamento;
  /** E11-S05 AC-6: exclusão obrigatória de qualquer segmento/campanha de reativação. */
  naoContatar?: boolean;
}

export type NovoLead = Omit<Lead, "id" | "estagio" | "criadoEm" | "notas">;

export interface LeadRepository {
  listar(): Promise<Lead[]>;
  obter(id: string): Promise<Lead | null>;
  criar(input: NovoLead): Promise<Lead>;
  moverEstagio(id: string, estagio: EstagioLead): Promise<void>;
  adicionarNota(id: string, nota: string): Promise<void>;
  atualizarPerfil(id: string, patch: Partial<PerfilLead>, origem: OrigemCampoPerfil): Promise<void>;
  responderQualificacao(id: string, perguntaId: string, resposta: string): Promise<void>;
  decidirGateAgendamento(
    id: string,
    decisao: "aprovado" | "recusado",
    autor: string,
    motivoRecusa?: string,
  ): Promise<void>;
}
