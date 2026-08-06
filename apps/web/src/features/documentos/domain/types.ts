export type DocumentoStatus = "pendente" | "enviado" | "em_analise" | "aprovado" | "ajustes";

export interface Documento {
  id: string;
  clienteId: string;
  faseId?: string;
  nome: string;
  tipo: string;
  status: DocumentoStatus;
  urlMock?: string;
  enviadoEm?: string;
}

export type StatusAssinatura = "aguardando" | "assinado";

export interface SolicitacaoAssinatura {
  id: string;
  documentoId: string;
  status: StatusAssinatura;
  assinadoPor?: string;
  assinadoEm?: string;
}
