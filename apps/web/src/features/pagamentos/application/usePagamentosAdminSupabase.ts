import { obterConsultaPagamentosAdminReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { PagamentosAdminConsulta } from "./ports";

type Dados = Awaited<ReturnType<PagamentosAdminConsulta["carregarAdmin"]>>;
const VAZIO: Dados = { pagamentos: [], nomesClientes: {} };

/** E03-S07 (Fase 7/US4) — fila admin de conciliação, refetch manual após decisão. */
export function usePagamentosAdminSupabase() {
  const [dados, setDados] = useState<Dados>(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);
  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await obterConsultaPagamentosAdminReal().carregarAdmin());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar pagamentos."));
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => {
    void refetch();
  }, [refetch]);
  return { ...dados, carregando, erro, refetch };
}
