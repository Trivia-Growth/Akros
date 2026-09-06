import { obterConsultaComunicacaoReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { EventoComunicacao } from "../domain/types";

export function useComunicacaoClienteReal() {
  const [eventos, setEventos] = useState<EventoComunicacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setEventos(await obterConsultaComunicacaoReal().carregarCliente());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar mensagens."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { eventos, carregando, erro, refetch };
}
