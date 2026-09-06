import type { Reuniao } from "@/features/agenda/domain/types";
import type { Conversa, EmailThread, EventoComunicacao } from "@/features/comunicacao/domain/types";
import type { Documento } from "@/features/documentos/domain/types";
import type { Jornada } from "@/features/jornada/domain/types";
import type { Pagamento } from "@/features/pagamentos/domain/types";
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
