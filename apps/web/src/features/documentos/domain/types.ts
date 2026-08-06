export type DocumentoStatus = "pendente" | "enviado" | "em_analise" | "aprovado" | "ajustes";

/** E07-S01 / ADR-0005 — catálogo tipado, consumido pela análise de IA. */
export type TipoDocumento =
  | "contrato"
  | "curriculo"
  | "formacao_academica"
  | "business_plan"
  | "carta_recomendacao"
  | "carta_experiencia"
  | "avaliacao_educacional"
  | "questionario_uscis"
  | "peticao"
  | "comprovante"
  | "aprovacao_uscis"
  | "estatuto_instituicao"
  | "comprovante_isencao_fiscal"
  | "extrato_bancario"
  | "demonstrativo_financeiro"
  | "traducao_certificada"
  | "carteira_trabalho"
  | "outro";

export interface Documento {
  id: string;
  clienteId: string;
  faseId?: string;
  nome: string;
  tipo: TipoDocumento;
  status: DocumentoStatus;
  urlMock?: string;
  enviadoEm?: string;
  /** E06-S01: liga o documento ao requisito do catálogo do programa que o originou. */
  requisitoId?: string;
  /** E07-S01: parecer da IA. Nunca decide status — ADR-0005. */
  analise?: AnaliseDocumento;
  /** E07-S02 AC-4: cliente escolheu enviar assim mesmo, contra o alerta da IA. */
  enviadoApesarDoAlerta?: boolean;
  /** E07-S03: decisão humana registrada sobre o documento. */
  decisao?: DecisaoRevisao;
  /**
   * Fixture-only (mock). Declara o "defeito" que o documento carrega para que
   * MockAnalisadorDocumento produza sempre o mesmo parecer — ver design de E07-S01.
   * Um adapter real (LLM) não usaria este campo.
   */
  metadadosFixture?: { faltando?: string[]; ressalvas?: string[] };
}

export type Aderencia = "atende" | "atende_com_ressalva" | "nao_atende" | "tipo_incorreto";
export type GravidadeLacuna = "impeditiva" | "recomendada";

export interface Lacuna {
  id: string;
  gravidade: GravidadeLacuna;
  descricao: string;
}

export interface AnaliseDocumento {
  documentoId: string;
  tipoDetectado: TipoDocumento;
  tipoEsperado: TipoDocumento;
  aderencia: Aderencia;
  confianca: number;
  lacunas: Lacuna[];
  sugestoes: string[];
  analisadoEm: string;
  motor: string;
}

export interface DecisaoRevisao {
  decisao: "aprovado" | "ajustes";
  autor: string;
  decididoEm: string;
  concordouComIA: boolean;
  motivoAjuste?: string;
}

export type StatusAssinatura = "aguardando" | "assinado";

export interface SolicitacaoAssinatura {
  id: string;
  documentoId: string;
  status: StatusAssinatura;
  assinadoPor?: string;
  assinadoEm?: string;
}
