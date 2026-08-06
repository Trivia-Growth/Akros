import type { Cliente } from "@/features/crm/domain/types";
import { useMockDb } from "@/mocks/store";
import { useDemoSession } from "./useDemoSession";

/** Cliente correspondente à persona ativa na sessão de demo (impersonação). */
export function useClienteAtivo(): Cliente | undefined {
  const personaId = useDemoSession((s) => s.personaId);
  const clientes = useMockDb((s) => s.clientes);
  return clientes.find((c) => c.id === personaId);
}
