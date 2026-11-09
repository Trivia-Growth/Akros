import { obterAnalisadorDocumentoReal } from "@/app/real-repositories";
import { useCallback, useState } from "react";
import type { TipoDocumento } from "../domain/types";
import type { RascunhoResposta } from "./ports";

/** E07-S05/US2+US3 — dispara cruzamento com requisito e rascunho de resposta, sob ação manual
 *  da equipe (nunca automático — gasta crédito OpenRouter). `tipo`/`objetivoRequisito` só
 *  importam para o adapter mock (demo) — o adapter real deriva tudo no servidor. */
export function useAnaliseIA() {
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [rascunhos, setRascunhos] = useState<Record<string, RascunhoResposta>>({});

  const analisarComIa = useCallback(async (documentoId: string, tipo: TipoDocumento) => {
    setErro(null);
    setProcessandoId(documentoId);
    try {
      await obterAnalisadorDocumentoReal().analisar({
        documentoId,
        tipoEsperado: tipo,
        objetivoRequisito: "",
      });
      return true;
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "analise_falhou");
      return false;
    } finally {
      setProcessandoId(null);
    }
  }, []);

  const gerarRascunho = useCallback(async (documentoId: string) => {
    setErro(null);
    setProcessandoId(documentoId);
    try {
      const rascunho = await obterAnalisadorDocumentoReal().rascunharResposta(documentoId);
      setRascunhos((atual) => ({ ...atual, [documentoId]: rascunho }));
      return true;
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "rascunho_falhou");
      return false;
    } finally {
      setProcessandoId(null);
    }
  }, []);

  return { analisarComIa, gerarRascunho, rascunhos, processandoId, erro };
}
