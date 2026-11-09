import type { DadosRecebimento, Pagamento } from "../domain/types";

/** Leitura dos pagamentos do cliente e instruções de recebimento permitidas por RLS. */
export interface PagamentosConsulta {
  carregarCliente(): Promise<{
    pagamentos: Pagamento[];
    dadosRecebimento: DadosRecebimento[];
  }>;
}

/** E03-S07 (Fase 7/US4) — fila admin de conciliação: todos os pagamentos autorizados por RLS. */
export interface PagamentosAdminConsulta {
  carregarAdmin(): Promise<{ pagamentos: Pagamento[]; nomesClientes: Record<string, string> }>;
}

/** E03-S07 (Fase 7/US4) — envio de comprovante pelo portal, reaproveitando o fluxo de arquivo de
 *  `envio-comandos` (reservar/finalizar) com `pagamentoId` em vez de `solicitacaoId`. */
export interface PagamentoComandos {
  reservar(input: {
    pagamentoId: string;
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

/** E03-S07 (Fase 7/US4) — admin confere o comprovante e decide, contra `revisao-comandos`. */
export interface ConciliacaoComandos {
  conciliar(input: {
    pagamentoId: string;
    decisao: "pago" | "divergente";
    valorRecebido: number;
    motivoDivergencia?: string;
    revisaoEsperada: number;
  }): Promise<Pagamento>;
}

export interface PagamentoRepository {
  listarPorCliente(clienteId: string): Promise<Pagamento[]>;
  criar(input: Omit<Pagamento, "id" | "status">): Promise<Pagamento>;
  /** @deprecated fluxo E10-S01 substitui por anexarComprovante + confirmar (equipe). */
  marcarComoPago(id: string): Promise<void>;
  dadosRecebimento(moeda: "BRL" | "USD"): DadosRecebimento;
  anexarComprovante(id: string, urlMock: string): Promise<void>;
  confirmar(id: string, autor: string): Promise<void>;
  marcarDivergencia(id: string, valorRecebido: number, autor: string): Promise<void>;
}
