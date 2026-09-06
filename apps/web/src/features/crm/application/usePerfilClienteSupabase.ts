import { obterConsultaPerfilClienteReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { Cliente } from "../domain/types";

/** Perfil do portal real: consulta própria linha pelo token; claim legado não participa. */
export function usePerfilClienteSupabase() {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setCliente(await obterConsultaPerfilClienteReal().carregar());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar o perfil."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { cliente, carregando, erro, refetch };
}
