/** E06-S01 / ADR-0004 — Programa de visto como dado versionado. */
export type SujeitoPrograma = "individuo" | "organizacao";
export type CategoriaPrograma = "imigrante" | "nao_imigrante";
export type ResponsavelEtapa = "cliente" | "akros" | "terceiro" | "uscis";
export type EmissorDocumento = "cliente" | "empregador" | "instituicao" | "terceiro_certificado";

// SPEC_DEVIATION (E06-S01 AC-1/AC-5): título/descrição de fase, etapa e requisito ficam em
// PT-BR literal, seguindo o mesmo padrão já usado em mocks/jornada-template.ts (que nunca foi
// traduzido). Introduzir um namespace i18n dinâmico por programa é trabalho real e não foi
// priorizado nesta rodada — registrado aqui em vez de silencioso, por instrução do CLAUDE.md.

// E06-S05 — habilita a IA de análise (E07-S01/ADR-0005) a receber uma instrução e um documento-
// modelo próprios deste requisito, em vez do objetivo genérico. A IA nunca aprova/arquiva sozinha
// — skill e referência mudam a qualidade do parecer, não quem decide (invariante do ADR-0005).
export interface AnaliseIAConfig {
  habilitada: boolean;
  skill: string;
  /** E06-S05/ADR-0013 — id do ArquivoReferencia atual (design.md). */
  arquivoReferenciaId?: string;
  // `arquivoReferenciaNome` é denormalização de exibição (o JSONB real já persistia esse campo
  // antes do histórico existir; o design.md lista só o id). Manter os dois evita migration.
  arquivoReferenciaNome?: string;
}

/** E06-S05/ADR-0013 — metadados do arquivo-modelo anexado pelo admin. Binário não persiste
 * (mesma regra do upload de documento do cliente, E02-S03). */
export interface ArquivoReferencia {
  id: string;
  requisitoId: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  enviadoEm: string;
  // design.md não lista `enviadoPor`, mas o AC-6 exige "quem trocou" — sem isto o histórico
  // registra só "quando". Desvio mínimo documentado.
  enviadoPor: string;
}

export interface RequisitoDocumento {
  id: string;
  faseTemplateId: string;
  tipo: string; // TipoDocumento (features/documentos/domain/types.ts) — string aqui evita import cruzado
  titulo: string;
  objetivo: string;
  obrigatorio: boolean;
  emitidoPor: EmissorDocumento;
  aceitaSubstituto?: string[];
  analiseIA?: AnaliseIAConfig;
  /** E06-S05 AC-2 — "desativar" para requisito com documento de cliente vinculado
   * (remoção é bloqueada, não cascade). Ausente = ativo. */
  ativo?: boolean;
  /** E06-S05 AC-6 — trocas de arquivo de referência ficam registradas (quem/quando),
   * nunca sobrescritas silenciosamente. */
  historicoArquivosReferencia?: ArquivoReferencia[];
}

export interface EtapaTemplate {
  id: string;
  titulo: string;
  descricao: string;
  prazoMedioDiasUteis?: number;
  responsavel: ResponsavelEtapa;
  responsavelDetalhe?: string; // ex.: "recomendante", "avaliador educacional"
  documentosRequeridos?: string[];
}

export interface FaseTemplate {
  id: string;
  ordem: number;
  titulo: string;
  descricao: string;
  etapas: EtapaTemplate[];
}

export interface Programa {
  id: string;
  codigo: string;
  nome: string;
  categoria: CategoriaPrograma;
  sujeito: SujeitoPrograma;
  versao: string;
  ativo: boolean;
  fasesTemplate: FaseTemplate[];
  documentosExigidos: RequisitoDocumento[];
}
