import { obterComandosConciliacaoReal } from "@/app/real-repositories";
import { useCallback, useState } from "react";

/** E03-S07 (Fase 7/US4) — admin confere e decide (pago/divergente), contra `revisao-comandos`. */
export function useConciliacaoComandos() {
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const conciliar = useCallback(
    async (input: {
      pagamentoId: string;
      decisao: "pago" | "divergente";
      valorRecebido: number;
      motivoDivergencia?: string;
      revisaoEsperada: number;
    }) => {
      setErro(null);
      setProcessandoId(input.pagamentoId);
      try {
        await obterComandosConciliacaoReal().conciliar(input);
        return true;
      } catch (causa) {
        setErro(causa instanceof Error ? causa.message : "conciliacao_falhou");
        return false;
      } finally {
        setProcessandoId(null);
      }
    },
    [],
  );

  return { conciliar, processandoId, erro };
}
