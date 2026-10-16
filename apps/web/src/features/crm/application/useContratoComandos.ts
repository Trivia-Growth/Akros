// E03-S07 (T035) — hook de application pros dois comandos de `CasoComandos` (registrar contrato,
// preparar caso). Mesmo estilo de `hooks.ts` (useState/useCallback) desta feature: nunca chama
// `getSupabase()`/`@supabase/*` direto — só a porta, via `container`.
//
// `container.casoComandos` (T039, tarefa futura) ainda não existe em `apps/web/src/app/di.ts`:
// esta task é só o adapter (T033) e este hook (T035), sem tocar em `di.ts`/`real-repositories.ts`
// (fora de escopo — ver task brief). `container` é tipado a partir do objeto literal (`as
// const`), então a chave `casoComandos` não existe ainda no tipo `Container`; o cast abaixo
// documenta essa lacuna conhecida em vez de escondê-la. Nenhuma tela chama este hook hoje
// (T037/T038 são futuras), então não há caminho de execução real passando por aqui — quando
// T039 registrar `container.casoComandos` de verdade, este cast pode (e deve) sair.
import { container } from "@/app/di";
import { useCallback, useState } from "react";
import type { CasoComandoError, CasoComandos } from "./ports";

function obterCasoComandos(): CasoComandos {
  return (container as unknown as { casoComandos: CasoComandos }).casoComandos;
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
