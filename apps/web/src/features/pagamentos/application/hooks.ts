import { useMockDb } from "@/mocks/store";
import { useMemo } from "react";
import type { Pagamento } from "../domain/types";

export function usePagamentosCliente(clienteId: string | undefined): Pagamento[] {
  const pagamentos = useMockDb((s) => s.pagamentos);
  return useMemo(
    () => (clienteId ? pagamentos.filter((p) => p.clienteId === clienteId) : []),
    [pagamentos, clienteId],
  );
}
