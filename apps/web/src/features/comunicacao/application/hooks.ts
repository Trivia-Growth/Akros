import { useMockDb } from "@/mocks/store";
import type { Conversa } from "../domain/types";

export function useConversaCliente(clienteId: string | undefined): Conversa | undefined {
  return useMockDb((s) => s.conversas.find((c) => c.clienteId === clienteId));
}

export function useConversas(): Conversa[] {
  return useMockDb((s) => s.conversas);
}
