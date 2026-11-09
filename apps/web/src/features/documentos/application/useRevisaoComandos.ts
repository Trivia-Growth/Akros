import { obterConsultaVersoesDocumento, obterRevisaoDocumentoReal } from "@/app/real-repositories";
import { useCallback, useState } from "react";

/** E03-S07 (Fase 6/US3) — aprovar/devolver documento em análise, contra `revisao-comandos`. */
export function useRevisaoComandos() {
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const revisar = useCallback(
    async (input: {
      documentoId: string;
      revisaoEsperada: number;
      decisao: "aprovado" | "ajustes";
      justificativa?: string;
    }) => {
      setErro(null);
      setProcessandoId(input.documentoId);
      try {
        const versoes = await obterConsultaVersoesDocumento().listarPorDocumento(input.documentoId);
        const ultimaRecebida = [...versoes]
          .filter((versao) => versao.estadoRecebimento === "recebida")
          .sort((a, b) => b.numeroVersao - a.numeroVersao)[0];
        if (!ultimaRecebida) throw new Error("sem_versao_recebida");

        await obterRevisaoDocumentoReal().revisar({
          documentoId: input.documentoId,
          versaoId: ultimaRecebida.id,
          decisao: input.decisao,
          justificativa: input.justificativa,
          revisaoEsperada: input.revisaoEsperada,
        });
        return true;
      } catch (causa) {
        setErro(causa instanceof Error ? causa.message : "revisao_falhou");
        return false;
      } finally {
        setProcessandoId(null);
      }
    },
    [],
  );

  return { revisar, processandoId, erro };
}
