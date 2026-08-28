import type { Cliente } from "@/features/crm/domain/types";
import { useSessaoAtual } from "@/features/sessao/application/hooks";
import { useMockDb } from "@/mocks/store";
import { isDemoMode } from "@/shared/lib/env";
import { useDemoSession } from "./useDemoSession";

/**
 * Cliente correspondente à persona ativa.
 *
 * Em modo demo: persona escolhida na barra de impersonação (`useDemoSession`), como sempre foi.
 *
 * Fora do modo demo (E12-S02): não há tabela `usuarios`/`clientes` real ainda (isso é E13) — a
 * ponte é `sessao.usuario.clienteId`, que foi setado no cadastro do usuário Supabase Auth com o
 * MESMO id da persona mockada (`"cliente-carlos"`). SPEC_DEVIATION documentada: em E13,
 * `clienteId` passa a apontar pra uma linha real de `clientes`, não pro array de personas.
 */
export function useClienteAtivo(): Cliente | undefined {
  const sessao = useSessaoAtual();
  const personaIdDemo = useDemoSession((s) => s.personaId);
  const clientes = useMockDb((s) => s.clientes);

  const personaId = isDemoMode ? personaIdDemo : sessao?.usuario.clienteId;
  return clientes.find((c) => c.id === personaId);
}
