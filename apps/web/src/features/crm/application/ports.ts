import type { Reuniao } from "@/features/agenda/domain/types";
import type { Conversa, EmailThread, EventoComunicacao } from "@/features/comunicacao/domain/types";
import type { Documento } from "@/features/documentos/domain/types";
import type { Jornada } from "@/features/jornada/domain/types";
import type { Pagamento } from "@/features/pagamentos/domain/types";
import type { Contrato } from "../domain/contrato";
import type { PapelParticipante, Participante, SujeitoTipo } from "../domain/participante";
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
    /** E03-S07/FR-022: contratos ativos — ausência para um cliente é cadastro incompleto. */
    contratos: Contrato[];
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
    origem?: "importado" | "nascido_na_plataforma";
    idempotencyKey: string;
  }): Promise<{ id: string; clienteId: string; faseAtualId: string | null }>;

  vincularPasta(input: {
    clienteId: string;
    jornadaId: string;
    integracaoId: string;
    folderItemId: string;
    caminhoExibicao?: string;
    idempotencyKey: string;
  }): Promise<void>;

  solicitarDocumento(
    input: {
      clienteId: string;
      faseId: string;
      requisitoId: string;
      titulo: string;
      prazoEm?: string;
      instrucao?: string;
      idempotencyKey: string;
    } & (
      | { sujeitoTipo: "caso" }
      | { sujeitoTipo: "participante"; sujeitoParticipanteId: string }
      | { sujeitoTipo: "familiar"; sujeitoFamiliarId: string }
    ),
  ): Promise<void>;

  /** E03-S07 (T049/T046) — convida um participante para o caso (ADR-0018, FR-017/FR-020). O
   *  Select de `papel` da UI sempre apresenta os 4 papéis fixos do domínio: a validação real de
   *  "este papel existe na versão do programa do caso" é feita no servidor
   *  (`crm.convidar_participante`, migration 0024), que responde 422 quando não bate — nunca
   *  repita essa checagem no cliente contra um catálogo próprio (duas fontes de verdade
   *  divergem). */
  convidarParticipante(input: {
    clienteId: string;
    papel: PapelParticipante;
    sujeitoTipo: SujeitoTipo;
    familiarId?: string;
    organizacaoId?: string;
    nomeExibicao: string;
    email?: string;
    idempotencyKey: string;
  }): Promise<Participante>;

  /** FR-020 — revoga só o participante indicado; nunca afeta os demais do mesmo caso (ver
   *  `crm.revogar_participante`, migration 0024, e `participante.test.ts` pela prova no domínio). */
  revogarParticipante(input: {
    participanteId: string;
    idempotencyKey: string;
  }): Promise<Participante>;

  /** E03-S07 (Fase 7/US4) — cadastra o pagamento a partir de uma condição contratual já
   *  registrada (`crm.cadastrar_cobranca`, migration 0045). Recusa (422) condição do tipo
   *  'outro' ou já com cobrança cadastrada (409). */
  cadastrarCobranca(input: {
    contratoCondicaoId: string;
    idempotencyKey: string;
  }): Promise<Pagamento>;
}

/** E03-S07 (Fase 8/US5) — uma linha da carteira (`crm.carteira_casos`). `responsavel` ausente
 *  (`undefined`) significa "nenhuma pendência de verdade" — distinto de "akros"/"cliente". */
export interface ItemCarteira {
  clienteId: string;
  clienteNome: string;
  programaId?: string;
  faseAtualTitulo?: string;
  responsavel?: "cliente" | "akros";
  documentosFaltantes: number;
  documentosEmRevisao: number;
  documentosEmAjustes: number;
  pagamentosVencidos: number;
  pagamentosEmConferencia: number;
  situacaoFinanceira: "em_dia" | "atrasado";
  levantamentoEstado: "incompleto" | "conferido";
  prazoMaisProximo?: string;
  atualizadoEm: string;
}

/** Agregado sobre TODO o conjunto filtrado, não só a página atual (design-tecnico.md §1.7). */
export interface TotaisCarteira {
  total: number;
  aguardandoCliente: number;
  aguardandoAkros: number;
  financeiroAtrasado: number;
  cadastroIncompleto: number;
}

export interface FiltrosCarteira {
  busca?: string;
  programa?: string;
  fase?: string;
  responsavel?: "cliente" | "akros";
  tipoPendencia?: "documento" | "pagamento";
  prazoAte?: string;
}

/** Opaco para quem consome: só o que a página anterior devolveu, devolvido de volta. */
export interface CursorCarteira {
  atualizadoEm: string;
  clienteId: string;
}

/** E03-S07 (Fase 8/US5) — carteira inteira paginada por cursor, contra `crm.carteira_casos`. */
export interface CarteiraConsulta {
  buscar(
    filtros: FiltrosCarteira,
    cursor?: CursorCarteira | null,
  ): Promise<{
    itens: ItemCarteira[];
    proximoCursor: CursorCarteira | null;
    totais: TotaisCarteira;
  }>;
}

export interface VinculoPastaConsulta {
  carregar(
    clienteId: string,
    jornadaId: string,
  ): Promise<{ folderItemId: string; estado: string } | null>;
}

/** E03-S07 (T049) — leitura dos participantes de um caso para o painel admin
 * (`ParticipantesPainel.tsx`). RLS decide o recorte (mesmo critério de `DocumentosConsulta`). */
export interface ParticipantesConsulta {
  carregar(clienteId: string): Promise<Participante[]>;
}
