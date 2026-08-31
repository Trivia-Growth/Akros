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
 * Fora do modo demo (E13-S08): `sessao.usuario.clienteId` (setado no cadastro do usuário
 * Supabase Auth como o mesmo id string do mock, ex. `"cliente-carlos"`) busca a linha real via
 * `useClienteReal` — que internamente traduz esse id pro uuid de `crm.clientes` (ver
 * `SupabaseClienteRepository`, SPEC_DEVIATION documentada em `specs/E13-S08.../design.md`).
 */
export function useClienteAtivo(): Cliente | undefined {
  const sessao = useSessaoAtual();
  const personaIdDemo = useDemoSession((s) => s.personaId);
  const clienteId = isDemoMode ? personaIdDemo : sessao?.usuario.clienteId;
  const { cliente } = useClienteReal(clienteId);
  return cliente;
}
