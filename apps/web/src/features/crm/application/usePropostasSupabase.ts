import { obterConsultaPropostasReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { Proposta } from "../domain/types";
import type { ContatoProposta } from "./ports";

const VAZIO = { propostas: [] as Proposta[], contatos: [] as ContatoProposta[] };

/** Query isolada para rotas admin reais; sem carregar `di.ts` ou Zustand de demo. */
export function usePropostasSupabase() {
  const [dados, setDados] = useState(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await obterConsultaPropostasReal().carregarAdmin());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar propostas."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { ...dados, carregando, erro, refetch };
}
