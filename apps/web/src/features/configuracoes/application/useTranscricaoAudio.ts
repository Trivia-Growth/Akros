import { obterTranscricaoAudioReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { TranscricaoAudio } from "../domain/transcricao";
import type { TranscricaoAudioPort } from "./ports";

/** E13-S15 — estado remoto da transcrição de áudio para a tela real (sem Zustand, como `useEvolutionCanal`). */
export function useTranscricaoAudio(porta: TranscricaoAudioPort = obterTranscricaoAudioReal()) {
  const [config, setConfig] = useState<TranscricaoAudio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const recarregar = useCallback(async () => {
    setErro(null);
    try {
      setConfig(await porta.carregar());
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa
          : new Error("Não foi possível carregar a transcrição de áudio."),
      );
    } finally {
      setCarregando(false);
    }
  }, [porta]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  return { config, carregando, erro, recarregar, porta };
}
