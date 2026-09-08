import { obterRepositorioClientes } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { Cliente } from "../domain/types";

/** E13-S11: hook real isolado; não importa o Zustand da demo no chunk consumidor. */
export function useClientesSupabase(): {
  clientes: Cliente[];
  carregando: boolean;
  erro: Error | null;
  refetch: () => Promise<void>;
} {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setClientes(await (await obterRepositorioClientes()).listar());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar clientes."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { clientes, carregando, erro, refetch };
}
