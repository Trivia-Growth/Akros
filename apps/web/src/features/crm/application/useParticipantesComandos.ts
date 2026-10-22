// E03-S07 (T049) — hook de application pros dois comandos de participante (convidar, revogar),
// mesmo estilo de `useContratoComandos.ts`: nunca chama `getSupabase()`/`@supabase/*` direto —
// só a porta, via `container.casoComandos` (mesma porta de `registrarContrato`/`prepararCaso`;
// `convidar_participante`/`revogar_participante` são ações da MESMA Edge Function `caso-
// comandos`, não uma Edge Function nova).
import { container } from "@/app/di";
import { useCallback, useState } from "react";
import type { CasoComandoError, CasoComandos } from "./ports";

function obterCasoComandos(): CasoComandos {
  return container.casoComandos;
}

export function useParticipantesComandos() {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<CasoComandoError | null>(null);

  const convidar = useCallback(
    async (input: Parameters<CasoComandos["convidarParticipante"]>[0]) => {
      setSalvando(true);
      setErro(null);
      try {
        return await obterCasoComandos().convidarParticipante(input);
      } catch (causa) {
        setErro(causa as CasoComandoError);
        throw causa;
      } finally {
        setSalvando(false);
      }
    },
    [],
  );

  const revogar = useCallback(async (input: Parameters<CasoComandos["revogarParticipante"]>[0]) => {
    setSalvando(true);
    setErro(null);
    try {
      return await obterCasoComandos().revogarParticipante(input);
    } catch (causa) {
      setErro(causa as CasoComandoError);
      throw causa;
    } finally {
      setSalvando(false);
    }
  }, []);

  return { convidar, revogar, salvando, erro };
}
