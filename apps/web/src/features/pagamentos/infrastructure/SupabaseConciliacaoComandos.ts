import { getSupabase } from "@/shared/supabase/client";
import type { ConciliacaoComandos } from "../application/ports";
import { paraPagamento } from "./SupabasePagamentosConsulta";

const CABECALHO_CSRF = { "x-akros-csrf": "1" };

export class SupabaseConciliacaoComandos implements ConciliacaoComandos {
  async conciliar(input: {
    pagamentoId: string;
    decisao: "pago" | "divergente";
    valorRecebido: number;
    motivoDivergencia?: string;
    revisaoEsperada: number;
  }) {
    const { data, error } = await getSupabase().functions.invoke("revisao-comandos", {
      headers: CABECALHO_CSRF,
      body: {
        acao: "conciliar_pagamento",
        pagamentoId: input.pagamentoId,
        decisao: input.decisao,
        valorRecebido: input.valorRecebido,
        motivoDivergencia: input.motivoDivergencia,
        revisaoEsperada: input.revisaoEsperada,
        idempotencyKey: crypto.randomUUID(),
      },
    });
    if (error) {
      const status = (error as { context?: Response }).context?.status ?? 500;
      throw new Error(`conciliacao_falhou_${status}`);
    }
    return paraPagamento(data as Parameters<typeof paraPagamento>[0]);
  }
}
