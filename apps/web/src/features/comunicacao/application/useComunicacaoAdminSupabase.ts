import { obterConsultaComunicacaoAdminReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { Conversa, EmailThread, EventoComunicacao, FonteConhecimento } from "../domain/types";
import type { ResumoAgenteIA } from "./ports";

const VAZIO = {
  conversas: [] as Conversa[],
  emails: [] as EmailThread[],
  eventos: [] as EventoComunicacao[],
  agentes: [] as ResumoAgenteIA[],
  fontes: [] as FonteConhecimento[],
};

export function useComunicacaoAdminSupabase() {
  const [dados, setDados] = useState(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await obterConsultaComunicacaoAdminReal().carregarAdmin());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar comunicação."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { ...dados, carregando, erro, refetch };
}
