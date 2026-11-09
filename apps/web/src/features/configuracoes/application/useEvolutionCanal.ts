import { obterEvolutionCanalReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { DadosEvolution } from "../domain/evolution";
import type { EvolutionCanalPort } from "./ports";

const VAZIO: DadosEvolution = { servidor: null, compatibilidade: [], canais: [] };

/** E13-S15 — estado remoto do canal Evolution para a tela real (sem Zustand, como `useConfiguracoesReais`). */
export function useEvolutionCanal(porta: EvolutionCanalPort = obterEvolutionCanalReal()) {
  const [dados, setDados] = useState<DadosEvolution>(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const recarregar = useCallback(async () => {
    setErro(null);
    try {
      setDados(await porta.carregar());
    } catch (causa) {
      setErro(
        causa instanceof Error ? causa : new Error("Não foi possível carregar o canal Evolution."),
      );
    } finally {
      setCarregando(false);
    }
  }, [porta]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  return { ...dados, carregando, erro, recarregar, porta };
}
