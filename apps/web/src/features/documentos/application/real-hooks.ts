import { obterConsultaDocumentosReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { Documento, SolicitacaoAssinatura } from "../domain/types";

const VAZIO = { documentos: [] as Documento[], solicitacoes: [] as SolicitacaoAssinatura[] };

export function useDocumentosClienteReal() {
  const [dados, setDados] = useState(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await obterConsultaDocumentosReal().carregarCliente());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar documentos."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { ...dados, carregando, erro, refetch };
}
