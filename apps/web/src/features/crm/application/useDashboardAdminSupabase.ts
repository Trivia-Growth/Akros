import { obterConsultaDashboardAdminReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { DashboardAdminConsulta } from "./ports";

type DadosDashboard = Awaited<ReturnType<DashboardAdminConsulta["carregarAdmin"]>>;

const VAZIO: DadosDashboard = {
  funil: [],
  clientesPorFase: [],
  saude: { emDia: 0, atencao: 0, atrasado: 0 },
  receita: [],
  proximasReunioes: [],
  atividadeRecente: [],
  pendencias: 0,
};

export function useDashboardAdminSupabase() {
  const [dados, setDados] = useState(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await obterConsultaDashboardAdminReal().carregarAdmin());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar o dashboard."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { ...dados, carregando, erro, refetch };
}
