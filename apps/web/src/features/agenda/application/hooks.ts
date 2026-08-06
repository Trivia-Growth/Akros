import { useMockDb } from "@/mocks/store";
import { useMemo } from "react";
import type { Reuniao, Transcricao } from "../domain/types";

export function useReunioesCliente(clienteId: string | undefined): Reuniao[] {
  const reunioes = useMockDb((s) => s.reunioes);
  return useMemo(
    () => (clienteId ? reunioes.filter((r) => r.clienteId === clienteId) : []),
    [reunioes, clienteId],
  );
}

export function useTranscricaoPorReuniao(reuniaoId: string | undefined): Transcricao | undefined {
  return useMockDb((s) => s.transcricoes.find((t) => t.reuniaoId === reuniaoId));
}
