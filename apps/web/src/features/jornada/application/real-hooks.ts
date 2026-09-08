import { obterConsultaJornadaReal, obterConsultaOperacaoAdminReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { Jornada } from "../domain/types";

export function useJornadaClienteReal() {
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setJornada(await obterConsultaJornadaReal().carregarCliente());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar a jornada."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { jornada, carregando, erro, refetch };
}

export function useOperacaoAdminReal() {
  const [dados, setDados] = useState<Awaited<
    ReturnType<ReturnType<typeof obterConsultaOperacaoAdminReal>["carregarAdmin"]>
  > | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await obterConsultaOperacaoAdminReal().carregarAdmin());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar a operação."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { dados, carregando, erro, refetch };
}
