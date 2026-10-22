// E03-S07 (T049) — leitura de participantes do caso para `ParticipantesPainel.tsx`. Mesmo
// formato de `useCliente360AdminSupabase.ts` (carregando/erro/refetch), chamando
// `obterConsultaParticipantesReal()` de `@/app/real-repositories` direto (sem variante Mock,
// mesmo critério já usado pelas demais consultas reais desta feature já migradas).
import { obterConsultaParticipantesReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { Participante } from "../domain/participante";

export function useParticipantesConsulta(clienteId: string) {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setParticipantes(await obterConsultaParticipantesReal().carregar(clienteId));
    } catch (causa) {
      setErro(
        causa instanceof Error ? causa : new Error("Não foi possível carregar os participantes."),
      );
    } finally {
      setCarregando(false);
    }
  }, [clienteId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { participantes, carregando, erro, refetch };
}
