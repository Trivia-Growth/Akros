import type { Reuniao } from "@/features/agenda/domain/types";
import type { Conversa, EmailThread, EventoComunicacao } from "@/features/comunicacao/domain/types";
import type { Documento } from "@/features/documentos/domain/types";
import type { Jornada } from "@/features/jornada/domain/types";
import type { Pagamento } from "@/features/pagamentos/domain/types";
import type { Contrato } from "../domain/contrato";
import type { Cliente, Proposta } from "../domain/types";

export interface ClienteRepository {
  listar(): Promise<Cliente[]>;
  obter(id: string): Promise<Cliente | null>;
  /** E06-S03: programaCodigo omitido usa "eb2-niw" (default histórico do protótipo). */
  criarAPartirDeLead(leadId: string, programaCodigo?: string): Promise<Cliente>;
  atualizar(id: string, patch: Partial<Cliente>): Promise<void>;
}

/** Perfil do usuário autenticado. O adapter deixa RLS escolher a única linha visível. */
export interface PerfilClienteConsulta {
  carregar(): Promise<Cliente | null>;
}

export interface PropostaRepository {
  listar(): Promise<Proposta[]>;
  obter(id: string): Promise<Proposta | null>;
  criar(input: Omit<Proposta, "id" | "status" | "criadoEm">): Promise<Proposta>;
  enviar(id: string): Promise<void>;
  marcarStatus(id: string, status: Proposta["status"]): Promise<void>;
}

export interface ContatoProposta {
  id: string;
  nome: string;
  email: string;
}

/** Consulta admin para lista e documento de proposta, com contatos resolvidos por UUID. */
export interface PropostasConsulta {
  carregarAdmin(): Promise<{ propostas: Proposta[]; contatos: ContatoProposta[] }>;
}

export interface DashboardAdminConsulta {
  carregarAdmin(): Promise<{
    funil: { estagio: string; quantidade: number }[];
    clientesPorFase: { fase: string; quantidade: number }[];
    saude: { emDia: number; atencao: number; atrasado: number };
    receita: { moeda: "BRL" | "USD"; pago: number; pendente: number; atrasado: number }[];
    proximasReunioes: { id: string; titulo: string; inicio: string }[];
    atividadeRecente: { id: string; conteudo: string }[];
    pendencias: number;
  }>;
}

/** Visão 360 administrativa: fontes reais agrupadas somente após RLS autorizar cada linha. */
export interface Cliente360AdminConsulta {
  carregarAdmin(): Promise<{
    clientes: Cliente[];
    jornadas: Jornada[];
    documentos: Documento[];
    pagamentos: Pagamento[];
    reunioes: Reuniao[];
    conversas: Conversa[];
    emails: EmailThread[];
    eventos: EventoComunicacao[];
  }>;
}

/**
 * E03-S07 (T033) — erro de comando contra a Edge Function `caso-comandos`. `status` é o HTTP
 * status devolvido pelo servidor (403/422/409/413/429/500), sempre fiel ao que veio de lá; quem
 * decide a mensagem i18n final a partir dele é a camada de `interfaces/` (T037/T038, futuras),
 * não o adapter.
 */
export class CasoComandoError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Uma condição financeira do contrato, no formato de entrada (sem `id` — gerado pelo servidor). */
export interface CondicaoContratoInput {
  descricao: string;
  tipo: "entrada" | "parcela" | "taxa_federal" | "outro";
  valor: number;
  moeda: "BRL" | "USD";
  vencimento: string;
  ordem: number;
}

/** Porta dos dois comandos transacionais já aprovados em `_shared/caso-comandos.ts`
 * (T031/T032): registrar o contrato do caso e preparar a jornada a partir dele. */
export interface CasoComandos {
  registrarContrato(input: {
    clienteId: string;
    programaId: string;
    programaVersao: string;
    prazoRespostaDiasUteis: number;
    prioridade: "padrao" | "prioritaria";
    observacao?: string;
    condicoes: CondicaoContratoInput[];
    idempotencyKey: string;
  }): Promise<Contrato>;

  prepararCaso(input: {
    clienteId: string;
    contratoId: string;
    levantamentoEstado?: "incompleto" | "conferido";
    idempotencyKey: string;
  }): Promise<{ id: string; clienteId: string; faseAtualId: string | null }>;
}
