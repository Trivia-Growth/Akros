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
}

export type NovoLead = Omit<Lead, "id" | "estagio" | "criadoEm" | "notas">;

export interface LeadRepository {
  listar(): Promise<Lead[]>;
  obter(id: string): Promise<Lead | null>;
  criar(input: NovoLead): Promise<Lead>;
  moverEstagio(id: string, estagio: EstagioLead): Promise<void>;
  adicionarNota(id: string, nota: string): Promise<void>;
}
