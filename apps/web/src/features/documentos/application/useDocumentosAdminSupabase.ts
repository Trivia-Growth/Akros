import { obterConsultaDocumentosAdminReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { DocumentosAdminConsulta } from "./ports";

type Dados = Awaited<ReturnType<DocumentosAdminConsulta["carregarAdmin"]>>;
const VAZIO: Dados = { documentos: [], nomesClientes: {} };

export function useDocumentosAdminSupabase() {
  const [dados, setDados] = useState<Dados>(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);
  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await obterConsultaDocumentosAdminReal().carregarAdmin());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar a fila."));
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => {
    void refetch();
  }, [refetch]);
  return { ...dados, carregando, erro, refetch };
}
