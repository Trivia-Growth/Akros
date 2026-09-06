import { obterConsultaAgendaReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { Reuniao, Transcricao } from "../domain/types";

const VAZIO_CLIENTE = { reunioes: [] as Reuniao[], transcricoes: [] as Transcricao[] };
const VAZIO_ADMIN = { ...VAZIO_CLIENTE, nomesClientes: {} as Record<string, string> };

export function useAgendaClienteReal() {
  const [dados, setDados] = useState(VAZIO_CLIENTE);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await obterConsultaAgendaReal().carregarCliente());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar a agenda."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { ...dados, carregando, erro, refetch };
}

export function useAgendaAdminReal() {
  const [dados, setDados] = useState(VAZIO_ADMIN);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await obterConsultaAgendaReal().carregarAdmin());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar a agenda."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { ...dados, carregando, erro, refetch };
}
