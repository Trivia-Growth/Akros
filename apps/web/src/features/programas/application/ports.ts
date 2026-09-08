import type { ArquivoReferencia, Programa, RequisitoDocumento } from "../domain/types";

export interface ProgramaRepository {
  listar(apenasAtivos?: boolean): Promise<Programa[]>;
  obterPorCodigo(codigo: string): Promise<Programa | null>;
  salvar(programa: Programa): Promise<void>;
  duplicar(programaId: string): Promise<Programa | null>;
}

/**
 * E06-S05/ADR-0013 — primeira escrita em `programas` desde o ADR-0004, escopada a
 * `RequisitoDocumento`. A UI traduz `RemocaoRequisitoBloqueada` em oferta de "desativar"
 * (AC-2): remoção com `Documento.requisitoId` apontando é recusada, nunca cascade.
 */
export class RemocaoRequisitoBloqueada extends Error {
  constructor(
    readonly requisitoId: string,
    readonly documentosVinculados: number,
  ) {
    super(
      `Remoção bloqueada: ${documentosVinculados} documento(s) de cliente apontam para este requisito.`,
    );
    this.name = "RemocaoRequisitoBloqueada";
  }
}

export interface RequisitoDocumentoRepository {
  listarPorPrograma(programaId: string): Promise<RequisitoDocumento[]>;
  criar(input: Omit<RequisitoDocumento, "id">): Promise<RequisitoDocumento>;
  atualizar(id: string, input: Partial<RequisitoDocumento>): Promise<RequisitoDocumento>;
  remover(id: string): Promise<void>;
  /** AC-6 — troca registrada no histórico (quem/quando), sem sobrescrever silenciosamente. */
  salvarArquivoReferencia(
    requisitoId: string,
    arquivo: File,
    enviadoPor: string,
  ): Promise<ArquivoReferencia>;
  /** AC-2 — quantos Documentos de cliente apontam para o requisito (0 = remoção liberada).
   * Método além do design.md: o draft da UI precisa checar ANTES de oferecer remover. */
  contarDocumentosVinculados(requisitoId: string): Promise<number>;
}
