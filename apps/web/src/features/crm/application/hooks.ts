import { container } from "@/app/di";
import { useMockDb } from "@/mocks/store";
import { isDemoMode } from "@/shared/lib/env";
import { useCallback, useEffect, useState } from "react";
import type { Cliente } from "../domain/types";

/**
 * E13-S08: ponte único-cliente entre mock e Supabase real. Em modo demo, lê do `useMockDb`
 * (reativo, como sempre). Fora do modo demo, busca uma vez via `container.clientes.obter()`
 * (sem Realtime — ver design.md) e expõe `refetch()` pra chamar depois de mutação própria.
 */
export function useClienteReal(clienteId: string | undefined): {
  cliente: Cliente | undefined;
  carregando: boolean;
  refetch: () => void;
} {
  const clienteMock = useMockDb((s) => s.clientes.find((c) => c.id === clienteId));
  const [clienteReal, setClienteReal] = useState<Cliente | undefined>(undefined);
  const [carregando, setCarregando] = useState(!isDemoMode);

  const buscar = useCallback(() => {
    if (isDemoMode || !clienteId) return;
    setCarregando(true);
    container.clientes.obter(clienteId).then((cliente) => {
      setClienteReal(cliente ?? undefined);
      setCarregando(false);
    });
  }, [clienteId]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  if (isDemoMode) return { cliente: clienteMock, carregando: false, refetch: () => {} };
  return { cliente: clienteReal, carregando, refetch: buscar };
}

/**
 * E13-S08: lista de clientes pra telas admin. Mesma estratégia — mock reativo em modo demo,
 * fetch-on-mount + refetch manual fora dele.
 */
export function useClientesReais(): {
  clientes: Cliente[];
  carregando: boolean;
  refetch: () => void;
} {
  const clientesMock = useMockDb((s) => s.clientes);
  const [clientesReais, setClientesReais] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(!isDemoMode);

  const buscar = useCallback(() => {
    if (isDemoMode) return;
    setCarregando(true);
    container.clientes.listar().then((clientes) => {
      setClientesReais(clientes);
      setCarregando(false);
    });
  }, []);

  useEffect(() => {
    buscar();
  }, [buscar]);

  if (isDemoMode) return { clientes: clientesMock, carregando: false, refetch: () => {} };
  return { clientes: clientesReais, carregando, refetch: buscar };
}
