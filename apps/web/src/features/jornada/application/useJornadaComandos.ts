import { obterJornadaComandosReal } from "@/app/real-repositories";
import { useCallback, useState } from "react";

/** E03-S07 (Fase 6/US3) — admin decide etapa e libera fase, contra `revisao-comandos`. */
export function useJornadaComandos() {
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const decidirEtapa = useCallback(
    async (input: {
      etapaId: string;
      decisao: "concluida" | "pendente";
      motivo?: string;
      revisaoEsperada: number;
    }) => {
      setErro(null);
      setProcessandoId(input.etapaId);
      try {
        await obterJornadaComandosReal().decidirEtapa(input);
        return true;
      } catch (causa) {
        setErro(causa instanceof Error ? causa.message : "decisao_falhou");
        return false;
      } finally {
        setProcessandoId(null);
      }
    },
    [],
  );

  const liberarFase = useCallback(async (input: { faseId: string; revisaoEsperada: number }) => {
    setErro(null);
    setProcessandoId(input.faseId);
    try {
      await obterJornadaComandosReal().liberarFase(input);
      return true;
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "liberacao_falhou");
      return false;
    } finally {
      setProcessandoId(null);
    }
  }, []);

  return { decidirEtapa, liberarFase, processandoId, erro };
}
