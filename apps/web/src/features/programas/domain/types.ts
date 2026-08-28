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
  arquivoReferenciaNome?: string;
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
