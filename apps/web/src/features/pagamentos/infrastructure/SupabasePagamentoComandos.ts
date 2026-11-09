import { getSupabase } from "@/shared/supabase/client";
import type { PagamentoComandos } from "../application/ports";

const CABECALHO_CSRF = { "x-akros-csrf": "1" };

async function invocar<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().functions.invoke("envio-comandos", {
    headers: CABECALHO_CSRF,
    body,
  });
  if (!error) return data as T;
  const status = (error as { context?: Response }).context?.status ?? 500;
  throw new Error(`comprovante_falhou_${status}`);
}

/** E03-S07 (Fase 7/US4) — reaproveita `envio-comandos` (mesma Edge Function de envio de
 *  documento) com `pagamentoId` em vez de `solicitacaoId`. */
export class SupabasePagamentoComandos implements PagamentoComandos {
  reservar(input: {
    pagamentoId: string;
    nomeArquivo: string;
    tamanhoBytes: number;
    mime: string;
  }) {
    return invocar<{ versaoId: string; objetoPermitido: string; expiraEm: string }>({
      acao: "reservar_envio",
      pagamentoId: input.pagamentoId,
      nomeArquivo: input.nomeArquivo,
      tamanhoBytes: input.tamanhoBytes,
      mime: input.mime,
    });
  }

  finalizar(input: { versaoId: string; idempotencyKey: string; revisaoEsperada: number }) {
    return invocar<{ versaoId: string; recebidoEm: string; estadoArmazenamento: string }>({
      acao: "finalizar_envio",
      ...input,
    });
  }
}
