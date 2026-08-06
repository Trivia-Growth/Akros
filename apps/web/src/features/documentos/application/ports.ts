import type {
  AnaliseDocumento,
  Documento,
  SolicitacaoAssinatura,
  TipoDocumento,
} from "../domain/types";

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

/** E07-S01 / ADR-0005 — porta de análise de documento por IA. O parecer nunca decide status. */
export interface AnalisadorDocumentoPort {
  analisar(input: {
    documentoId: string;
    tipoEsperado: TipoDocumento;
    objetivoRequisito: string;
  }): Promise<AnaliseDocumento>;
}
