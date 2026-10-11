// _shared/autorizacao-caso.ts — autorização por participação (E03-S07). Mesmo padrão porta/
// adapter de `webhook.ts`/`io-supabase.ts`: aqui só a porta `IOAutorizacaoCaso` e a lógica pura
// que a consome; o adapter real (`service_role`) vive em `io-supabase-caso.ts`.
// `requireAdmin`/`requireServiceRole` já existem em `_shared/auth.ts` — não duplicados aqui.
import { forbidden, HttpError } from "./auth.ts";

export interface Participacao {
  clienteId: string;
  papel: "aplicante" | "beneficiario" | "organizacao_aplicante" | "familiar_apoio";
}

export interface IOAutorizacaoCaso {
  /** Linhas ativas de crm.participantes para este auth_user_id, MAIS o vínculo legado
   *  mono-titular (crm.clientes.auth_user_id) — mesma regra de crm.meus_casos()/crm.meus_papeis()
   *  em 0017. O adapter real resolve os dois; o fake de teste só precisa devolver a lista. */
  participacoesDoUsuario(authUserId: string): Promise<Participacao[]>;
}

/** Deriva o(s) caso(s)/papel(is) da SESSÃO (nunca de um clienteId que o chamador manda no body).
 *  Se `clienteId` for passado, filtra para as participações desse caso específico — devolve lista
 *  vazia (não lança) quando o usuário não participa; quem decide se isso é erro é `exigirPapel`,
 *  que conhece o contexto da operação. */
export async function resolverParticipacao(
  io: IOAutorizacaoCaso,
  authUserId: string,
  opts?: { clienteId?: string },
): Promise<Participacao[]> {
  const participacoes = await io.participacoesDoUsuario(authUserId);
  if (!opts?.clienteId) return participacoes;
  return participacoes.filter((p) => p.clienteId === opts.clienteId);
}

/** Lança 404 — não 403 — quando o chamador não participa do caso de forma alguma (não revela que
 *  o caso existe). Lança 403 se participa do caso, mas sem nenhum dos papéis pedidos. Devolve a
 *  `Participacao` correspondente ao primeiro papel exigido encontrado, em caso de sucesso. */
export async function exigirPapel(
  io: IOAutorizacaoCaso,
  authUserId: string,
  clienteId: string,
  papeis: Participacao["papel"][],
): Promise<Participacao> {
  const doCaso = await resolverParticipacao(io, authUserId, { clienteId });
  if (doCaso.length === 0) throw new HttpError(404, "Caso não encontrado");
  const comPapel = doCaso.find((p) => papeis.includes(p.papel));
  if (!comPapel) throw forbidden("Papel sem autoridade para esta ação");
  return comPapel;
}
