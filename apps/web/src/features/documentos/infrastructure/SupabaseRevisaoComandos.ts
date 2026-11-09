import { getSupabase } from "@/shared/supabase/client";
import type { RevisaoDocumentoComandos } from "../application/ports";
import { paraDocumento } from "./SupabaseDocumentosConsulta";

const CABECALHO_CSRF = { "x-akros-csrf": "1" };

export class SupabaseRevisaoComandos implements RevisaoDocumentoComandos {
  async revisar(input: {
    documentoId: string;
    versaoId: string;
    decisao: "aprovado" | "ajustes";
    justificativa?: string;
    revisaoEsperada: number;
  }) {
    const { data, error } = await getSupabase().functions.invoke("revisao-comandos", {
      headers: CABECALHO_CSRF,
      body: {
        acao: "revisar_documento",
        documentoId: input.documentoId,
        versaoId: input.versaoId,
        decisao: input.decisao,
        justificativa: input.justificativa,
        revisaoEsperada: input.revisaoEsperada,
        idempotencyKey: crypto.randomUUID(),
      },
    });
    if (error) {
      const status = (error as { context?: Response }).context?.status ?? 500;
      throw new Error(`revisao_falhou_${status}`);
    }
    return paraDocumento(data as Parameters<typeof paraDocumento>[0]);
  }
}
