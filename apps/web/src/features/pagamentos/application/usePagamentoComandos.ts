import { obterComandosPagamentoReal } from "@/app/real-repositories";
import { useCallback, useState } from "react";

type EstadoRecebimento = "ocioso" | "reservando" | "enviando" | "recebido" | "rejeitado";

/** E03-S07 (Fase 7/US4) — envio de comprovante pelo portal, reaproveitando o upload TUS do
 *  bucket `envios` (mesmo padrão de `useEnvioDocumento`). */
export function usePagamentoComandos(pagamentoId: string, revisaoAtual: number) {
  const [estado, setEstado] = useState<EstadoRecebimento>("ocioso");
  const [progresso, setProgresso] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  const enviarComprovante = useCallback(
    async (arquivo: File) => {
      setErro(null);
      setEstado("reservando");
      setProgresso(0);
      try {
        const { enviarArquivoAoBucket } = await import("@/shared/supabase/envio-tus");
        const reserva = await obterComandosPagamentoReal().reservar({
          pagamentoId,
          nomeArquivo: arquivo.name,
          tamanhoBytes: arquivo.size,
          mime: arquivo.type || "application/octet-stream",
        });
        setEstado("enviando");
        await enviarArquivoAoBucket({
          objetoPermitido: reserva.objetoPermitido,
          arquivo,
          onProgress: (enviados, total) =>
            setProgresso(total ? Math.round((enviados / total) * 100) : 0),
        }).promessa;
        await obterComandosPagamentoReal().finalizar({
          versaoId: reserva.versaoId,
          idempotencyKey: crypto.randomUUID(),
          revisaoEsperada: revisaoAtual,
        });
        setEstado("recebido");
        return true;
      } catch (causa) {
        setEstado("rejeitado");
        setErro(causa instanceof Error ? causa.message : "comprovante_falhou");
        return false;
      }
    },
    [pagamentoId, revisaoAtual],
  );

  return { estado, progresso, erro, enviarComprovante };
}
