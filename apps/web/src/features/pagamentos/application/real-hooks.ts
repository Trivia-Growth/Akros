import { obterConsultaPagamentosReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { DadosRecebimento, Pagamento } from "../domain/types";

const VAZIO = { pagamentos: [] as Pagamento[], dadosRecebimento: [] as DadosRecebimento[] };

export function usePagamentosClienteReal() {
  const [dados, setDados] = useState(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setDados(await obterConsultaPagamentosReal().carregarCliente());
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
