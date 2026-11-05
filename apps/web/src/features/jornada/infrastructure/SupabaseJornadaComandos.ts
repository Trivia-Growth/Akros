import { getSupabase } from "@/shared/supabase/client";
import type { JornadaComandos } from "../application/ports";

const CABECALHO_CSRF = { "x-akros-csrf": "1" };

async function invocar(body: Record<string, unknown>): Promise<void> {
  const { error } = await getSupabase().functions.invoke("revisao-comandos", {
    headers: CABECALHO_CSRF,
    body,
  });
  if (error) {
    const status = (error as { context?: Response }).context?.status ?? 500;
    throw new Error(`jornada_comando_falhou_${status}`);
  }
}

export class SupabaseJornadaComandos implements JornadaComandos {
  decidirEtapa(input: {
    etapaId: string;
    decisao: "concluida" | "pendente";
    motivo?: string;
    revisaoEsperada: number;
  }) {
    return invocar({
      acao: "decidir_etapa",
      etapaId: input.etapaId,
      decisao: input.decisao,
      motivo: input.motivo,
      revisaoEsperada: input.revisaoEsperada,
      idempotencyKey: crypto.randomUUID(),
    });
  }

  liberarFase(input: { faseId: string; revisaoEsperada: number }) {
    return invocar({
      acao: "liberar_fase",
      faseId: input.faseId,
      revisaoEsperada: input.revisaoEsperada,
      idempotencyKey: crypto.randomUUID(),
    });
  }
}
