import { obterConsultaCliente360AdminReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { Cliente360AdminConsulta } from "./ports";

type DadosCliente360 = Awaited<ReturnType<Cliente360AdminConsulta["carregarAdmin"]>>;

export function useCliente360AdminSupabase() {
  const [dados, setDados] = useState<DadosCliente360 | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await obterConsultaCliente360AdminReal().carregarAdmin());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar os clientes."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { dados, carregando, erro, refetch };
}
