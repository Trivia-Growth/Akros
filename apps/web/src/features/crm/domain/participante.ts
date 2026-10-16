/**
 * E03-S07 (US6) / ADR-0018 — domínio puro de Participante. Espelha as colunas de
 * `crm.participantes` (migration 0017: `papel`, `sujeito_tipo`, `familiar_id`,
 * `organizacao_id`, `estado`, `auth_user_id`). `PapelParticipante` vem do programa do caso
 * (congelado por ADR-0004/0014) — reusado de `shared/contracts/caso.ts`, nunca redeclarado.
 */
import type { PapelParticipante } from "@/shared/contracts/caso";

export type { PapelParticipante };

export type SujeitoTipo = "titular" | "familiar" | "organizacao";
export type EstadoParticipante = "ativo" | "revogado";

export interface Participante {
  id: string;
  clienteId: string;
  papel: PapelParticipante;
  sujeitoTipo: SujeitoTipo;
  familiarId?: string;
  organizacaoId?: string;
  nomeExibicao: string;
  email?: string;
  /** `undefined` = participante sem acesso ao portal (ADR-0018) — estado legítimo, não um erro. */
  authUserId?: string;
  estado: EstadoParticipante;
  convidadoPor?: string;
  convidadoEm?: string;
  revogadoPor?: string;
  revogadoEm?: string;
}

/**
 * FR-017/FR-019 — papel fora do conjunto que o programa declara é sempre recusado, mesmo que
 * seja um dos quatro `PapelParticipante` válidos em outro programa. Lista vazia recusa
 * qualquer papel (programa sem papéis declarados não aceita nenhum participante).
 */
export function papelPermitidoNoPrograma(
  papel: PapelParticipante,
  papeisDoPrograma: PapelParticipante[],
): boolean {
  return papeisDoPrograma.includes(papel);
}

/**
 * ADR-0018 — invariante mais importante desta fase: **nenhum** papel de `crm.participantes`
 * aprova documento, conclui etapa, libera fase, altera cobrança ou concilia. Só a equipe
 * (admin) faz isso. Existe como função nomeada (não uma constante solta) para que um comando
 * que precise decidir "isto é ação de equipe?" chame esta função e, vendo `false`, saiba que
 * não há papel de participante que a autorize — sempre `false`, para qualquer `PapelParticipante`.
 */
export function papelConcedeAutoridadeDeEquipe(_papel: PapelParticipante): boolean {
  return false;
}

export function participanteAtivo(participante: Participante): boolean {
  return participante.estado === "ativo";
}

/**
 * Devolve uma CÓPIA do participante com `estado: "revogado"` e os campos de revogação
 * preenchidos. Não muta o objeto recebido, e não mexe em `authUserId`/`papel`/`clienteId` —
 * histórico é preservado, só o acesso muda. Opera em um único participante; revogar um item
 * de uma lista não afeta os demais porque esta função nunca toca em nada além do argumento
 * que recebeu (ver participante.test.ts para a prova no nível de lista).
 */
export function revogarParticipante(
  participante: Participante,
  revogadoPor: string,
  revogadoEm: string,
): Participante {
  return {
    ...participante,
    estado: "revogado",
    revogadoPor,
    revogadoEm,
  };
}
