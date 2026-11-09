import type {
  AnaliseDocumento,
  Documento,
  SolicitacaoAssinatura,
  TipoDocumento,
  VersaoDocumento,
} from "../domain/types";

/** Leitura de documentos e assinaturas já limitada por RLS ao cliente autenticado. */
export interface DocumentosConsulta {
  carregarCliente(): Promise<{
    documentos: Documento[];
    solicitacoes: SolicitacaoAssinatura[];
  }>;
}

/** Fila de revisão admin: todos documentos e nomes autorizados por RLS, sem mutação browser. */
export interface DocumentosAdminConsulta {
  carregarAdmin(): Promise<{ documentos: Documento[]; nomesClientes: Record<string, string> }>;
}

export interface EnvioDocumentoComandos {
  reservar(input: {
    solicitacaoId: string;
    nomeArquivo: string;
    tamanhoBytes: number;
    mime: string;
  }): Promise<{ versaoId: string; objetoPermitido: string; expiraEm: string }>;
  finalizar(input: {
    versaoId: string;
    idempotencyKey: string;
    revisaoEsperada: number;
  }): Promise<{ versaoId: string; recebidoEm: string; estadoArmazenamento: string }>;
}

export interface VersoesConsulta {
  listarPorDocumento(documentoId: string): Promise<VersaoDocumento[]>;
}

/** E03-S07 (Fase 6/US3) — admin aprova ou devolve um documento em análise, contra a Edge
 *  Function `revisao-comandos`. Grava `documentos.decisoes_revisao` (append-only) na mesma
 *  transação da mudança de status. */
export interface RevisaoDocumentoComandos {
  revisar(input: {
    documentoId: string;
    versaoId: string;
    decisao: "aprovado" | "ajustes";
    justificativa?: string;
    revisaoEsperada: number;
  }): Promise<Documento>;
}

export interface ArquivoDownloadPort {
  baixar(versaoId: string): Promise<Blob>;
}

export interface EnvioArquivoPort {
  enviar(input: {
    objetoPermitido: string;
    arquivo: Blob;
    onProgress: (bytesEnviados: number, bytesTotais: number) => void;
  }): Promise<void>;
}

export class EnvioDocumentoError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface DocumentoRepository {
  listarPorCliente(clienteId: string): Promise<Documento[]>;
  obter(id: string): Promise<Documento | null>;
  registrarEnvio(id: string, urlMock: string): Promise<void>;
  /** E07-S02 AC-4 — cliente decide enviar assim mesmo, contra o alerta da IA. */
  confirmarEnvioApesarDoAlerta(id: string): Promise<void>;
  decidir(
    id: string,
    decisao: "aprovado" | "ajustes",
    autor: string,
    motivoAjuste?: string,
  ): Promise<void>;
}

export interface AssinaturaService {
  listarPorCliente(clienteId: string): Promise<SolicitacaoAssinatura[]>;
  assinar(id: string, nomeAssinante: string): Promise<void>;
}

/** E03-S07 (Fase 9... não, E07-S05/US1) — resultado das checagens locais de legibilidade, nunca
 *  envolve rede externa (FR-001/FR-002). `null` quando a versão ainda não foi processada. */
export interface PreAnaliseDocumento {
  versaoId: string;
  paginaCompleta: boolean;
  resolucaoSuficiente: boolean;
  tipoConteudo: "texto_pesquisavel" | "imagem_escaneada";
  motivoProblema?: string;
  calculadoEm: string;
}

/** E07-S05/US3 — rascunho de resposta ao cliente, calibrado pelo prazo/prioridade do contrato
 *  (FR-008). Nunca enviado automaticamente (FR-009). */
export interface RascunhoResposta {
  id: string;
  documentoId: string;
  texto: string;
  prazoRespostaDiasUteisUsado: number;
  prioridadeUsada: "padrao" | "prioritaria";
  geradoEm: string;
}

/** E07-S01 / ADR-0005 — porta de análise de documento por IA. O parecer nunca decide status.
 * E06-S05/ADR-0013 — skill e arquivo de referência do requisito entram como opcionais: mudam o
 * conteúdo do parecer, nunca o Documento.status.
 * E07-S05 — acrescenta pré-análise local (US1, sem IA) e rascunho de resposta (US3). */
export interface AnalisadorDocumentoPort {
  analisar(input: {
    documentoId: string;
    tipoEsperado: TipoDocumento;
    objetivoRequisito: string;
    skillAnalise?: string;
    arquivoReferenciaId?: string;
  }): Promise<AnaliseDocumento>;

  /** E07-S05/US1 — leitura, nunca dispara processamento. `null` se ainda não calculada. */
  obterPreAnalise(versaoId: string): Promise<PreAnaliseDocumento | null>;

  /** E07-S05/US3 — gera o rascunho a partir do parecer já existente (não recalcula o parecer). */
  rascunharResposta(documentoId: string): Promise<RascunhoResposta>;
}
