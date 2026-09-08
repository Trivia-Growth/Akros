import { obterConsultaConfiguracoesReais } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { ConfiguracoesConsulta } from "./ports";

const VAZIO: Awaited<ReturnType<ConfiguracoesConsulta["carregar"]>> = {
  equipe: [],
  integracoes: [],
  contasAgenda: [],
  contasCanal: [],
  agentesIA: [],
};

/** E13-S11 AC-1: estado remoto único para a página real, sem Zustand. */
export function useConfiguracoesReais() {
  const [dados, setDados] = useState(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await obterConsultaConfiguracoesReais().carregar());
    } catch (causa) {
      setErro(
        causa instanceof Error ? causa : new Error("Não foi possível carregar configurações."),
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { ...dados, carregando, erro, refetch };
}
