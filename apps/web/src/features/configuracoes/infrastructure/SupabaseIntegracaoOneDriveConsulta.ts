// E03-S07 Fase 5 (T058, ADR-0019) — leitura de `arquivos.integracoes_microsoft` para o cartão
// "Conta Microsoft / OneDrive" em `ConfiguracoesRealPage.tsx`. Mesmo critério de
// `SupabaseParticipantesConsulta.ts`: `.select()` sem lógica de negócio, RLS decide o recorte
// (`admin_ve_todas_integracoes_microsoft`, migration 0020 — só admin, GRANT SELECT a
// `authenticated` + policy admin-only, participante recebe []).
//
// Decisão de implementação (registrada também em tasks.md, "Decisões de implementação"): a
// tabela não tem uma constraint de "no máximo uma integração ativa" (fora de escopo desta
// frente — ver brief). `.order("conectado_em", { ascending: false }).limit(1)` lê a conexão MAIS
// RECENTE quando existir mais de uma linha (ex.: reconectar depois de revogar cria uma linha
// nova em vez de reescrever a anterior, mesmo critério de "alteração cria registro novo" já
// usado por `crm.registrar_contrato`, 0022) — nunca a decisão de QUAL integração usar em
// `vincular_pasta` (essa é um `integracaoId` explícito no comando, não inferido aqui).
import { getSupabase } from "@/shared/supabase/client";
import type { IntegracaoOneDriveConsulta } from "../application/ports";
import type { EstadoIntegracaoOneDrive, IntegracaoOneDrive } from "../domain/types";

interface LinhaIntegracaoOneDrive {
  id: string;
  conta_email: string;
  pasta_raiz_item_id: string;
  estado: EstadoIntegracaoOneDrive;
  conectado_em: string;
}

export function paraIntegracaoOneDrive(linha: LinhaIntegracaoOneDrive): IntegracaoOneDrive {
  return {
    id: linha.id,
    contaEmail: linha.conta_email,
    pastaRaizId: linha.pasta_raiz_item_id,
    estado: linha.estado,
    conectadoEm: linha.conectado_em,
  };
}

export class SupabaseIntegracaoOneDriveConsulta implements IntegracaoOneDriveConsulta {
  async carregar(): Promise<IntegracaoOneDrive | null> {
    const { data, error } = await getSupabase()
      .schema("arquivos")
      .from("integracoes_microsoft")
      .select("id,conta_email,pasta_raiz_item_id,estado,conectado_em")
      .order("conectado_em", { ascending: false })
      .limit(1)
      .maybeSingle<LinhaIntegracaoOneDrive>();
    if (error) throw error;
    if (!data) return null;
    return paraIntegracaoOneDrive(data);
  }
}
