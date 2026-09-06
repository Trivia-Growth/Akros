import { useClienteReal } from "@/features/crm/application/hooks";
import type { Cliente } from "@/features/crm/domain/types";
import { useSessaoAtual } from "@/features/sessao/application/hooks";
import { isDemoMode } from "@/shared/lib/env";
import { useDemoSession } from "./useDemoSession";

/**
 * Cliente correspondente à persona ativa.
 *
 * Em modo demo: persona escolhida na barra de impersonação (`useDemoSession`), como sempre foi.
 *
 * Fora do modo demo, `sessao.usuario.clienteId` é o UUID de `crm.clientes` emitido pelo claim
 * `app_metadata.cliente_id`; não há tradução para fixture.
 */
export function useClienteAtivo(): Cliente | undefined {
  const sessao = useSessaoAtual();
  const personaIdDemo = useDemoSession((s) => s.personaId);
  const clienteId = isDemoMode ? personaIdDemo : sessao?.usuario.clienteId;
  const { cliente } = useClienteReal(clienteId);
  return cliente;
}
