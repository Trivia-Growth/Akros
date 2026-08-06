import { container } from "@/app/di";
import { useEffect, useState } from "react";
import type { Pagamento } from "../domain/types";

export function usePagamentosCliente(clienteId: string | undefined): Pagamento[] {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);

  useEffect(() => {
    if (!clienteId) {
      setPagamentos([]);
      return;
    }
    container.pagamentos.listarPorCliente(clienteId).then(setPagamentos);
  }, [clienteId]);

  return pagamentos;
}
