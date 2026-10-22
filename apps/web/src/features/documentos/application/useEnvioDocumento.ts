import {
  obterComandosEnvioDocumento,
  obterConsultaVersoesDocumento,
  obterEnvioArquivoReal,
} from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { VersaoDocumento } from "../domain/types";

type EstadoRecebimento = "ocioso" | "reservando" | "enviando" | "recebido" | "rejeitado";
type EstadoArmazenamento = "pendente" | "transferindo" | "armazenado" | "falhou";

export function useEnvioDocumento(documentoId: string) {
  const [versoes, setVersoes] = useState<VersaoDocumento[]>([]);
  const [estadoRecebimento, setEstadoRecebimento] = useState<EstadoRecebimento>("ocioso");
  const [estadoArmazenamento, setEstadoArmazenamento] = useState<EstadoArmazenamento>("pendente");
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  const consultar = useCallback(async () => {
    setVersoes(await obterConsultaVersoesDocumento().listarPorDocumento(documentoId));
  }, [documentoId]);

  useEffect(() => {
    void consultar();
  }, [consultar]);

  const enviar = useCallback(
    async (arquivo: File) => {
      setErro(null);
      setEstadoRecebimento("reservando");
      setEstadoArmazenamento("pendente");
      setProgresso(0);
      try {
        const reserva = await obterComandosEnvioDocumento().reservar({
          solicitacaoId: documentoId,
          nomeArquivo: arquivo.name,
          tamanhoBytes: arquivo.size,
          mime: arquivo.type || "application/octet-stream",
        });
        setEstadoRecebimento("enviando");
        await obterEnvioArquivoReal().enviar({
          objetoPermitido: reserva.objetoPermitido,
          arquivo,
          onProgress: (enviados, total) =>
            setProgresso(total ? Math.round((enviados / total) * 100) : 0),
        });
        const recebido = await obterComandosEnvioDocumento().finalizar({
          versaoId: reserva.versaoId,
          idempotencyKey: crypto.randomUUID(),
          revisaoEsperada: 1,
        });
        setEstadoRecebimento("recebido");
        setEstadoArmazenamento(recebido.estadoArmazenamento as EstadoArmazenamento);
        void consultar().catch(() => undefined);
      } catch (causa) {
        setEstadoRecebimento("rejeitado");
        const chave = causa instanceof Error ? causa.message : "upload.invalidFile";
        setErro(chave);
      }
    },
    [consultar, documentoId],
  );

  return { versoes, estadoRecebimento, estadoArmazenamento, progresso, erro, enviar, consultar };
}
