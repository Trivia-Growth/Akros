// E03-S07 (T035) — hook de application pros dois comandos de `CasoComandos` (registrar contrato,
// preparar caso). Mesmo estilo de `hooks.ts` (useState/useCallback) desta feature: nunca chama
// `getSupabase()`/`@supabase/*` direto — só a porta, via `container`.
//
// `container.casoComandos` nasceu em `apps/web/src/app/di.ts` (T039) — ver `real-repositories.ts`
// (`obterCasoComandosReal()`) pela composição do adapter real.
import { container } from "@/app/di";
import { useCallback, useState } from "react";
import type { CasoComandoError, CasoComandos } from "./ports";

function obterCasoComandos(): CasoComandos {
  return container.casoComandos;
}

export function useContratoComandos() {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<CasoComandoError | null>(null);

  const registrarContrato = useCallback(
    async (input: Parameters<CasoComandos["registrarContrato"]>[0]) => {
      setSalvando(true);
      setErro(null);
      try {
        return await obterCasoComandos().registrarContrato(input);
      } catch (causa) {
        setErro(causa as CasoComandoError);
        throw causa;
      } finally {
        setSalvando(false);
      }
    },
    [],
  );

  const prepararCaso = useCallback(async (input: Parameters<CasoComandos["prepararCaso"]>[0]) => {
    setSalvando(true);
    setErro(null);
    try {
      return await obterCasoComandos().prepararCaso(input);
    } catch (causa) {
      setErro(causa as CasoComandoError);
      throw causa;
    } finally {
      setSalvando(false);
    }
  }, []);

  return { registrarContrato, prepararCaso, salvando, erro };
}
