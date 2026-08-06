import { useMockDb } from "@/mocks/store";
import type { Pagamento } from "../domain/types";

export function usePagamentosCliente(clienteId: string | undefined): Pagamento[] {
  return useMockDb((s) => (clienteId ? s.pagamentos.filter((p) => p.clienteId === clienteId) : []));
}
