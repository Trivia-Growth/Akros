/**
 * E03-S07 / ADR-0018 — contratos compartilhados do caso, participantes e papéis.
 *
 * `PapelParticipante` vem da versão do programa do caso (congelada por ADR-0004/0014); o
 * conjunto efetivamente em uso em um caso é o que a versão do programa declarar. Papel não
 * concede autoridade de equipe (aprovar, concluir etapa, liberar fase, conciliar) — ver ADR-0018.
 */
export type PapelParticipante =
  | "aplicante"
  | "beneficiario"
  | "organizacao_aplicante"
  | "familiar_apoio";

/** Sujeito a quem um documento ou solicitação pertence (FR-016/FR-017). */
export type SujeitoDocumento = "caso" | "participante" | "familiar";

/** Estado de recebimento da versão de arquivo — distinto de armazenamento (FR-005, ADR-0019). */
export type EstadoRecebimento = "reservada" | "recebida" | "rejeitada";

/** Estado de armazenamento no OneDrive — nunca confundir com recebimento (FR-005, ADR-0019). */
export type EstadoArmazenamento = "pendente" | "transferindo" | "armazenado" | "falhou";

export interface ResumoCaso {
  clienteId: string;
  faseAtual?: string;
  proximaAcao?: string;
  responsavel?: string;
  pendenciasCliente: number;
  pendenciasAkros: number;
  pendenciasTerceiro: number;
  documentosFaltantes: number;
  documentosEmRevisao: number;
  documentosEmAjustes: number;
  pagamentosVencidos: number;
  pagamentosEmConferencia: number;
  /** FR-013: cadastro sem levantamento completo nunca aparece como "sem pendências". */
  levantamentoEstado: "incompleto" | "conferido";
  atualizadoEm: string;
}
