import { useMockDb } from "@/mocks/store";
import type { Reuniao, Transcricao } from "../domain/types";

export function useReunioesCliente(clienteId: string | undefined): Reuniao[] {
  return useMockDb((s) => (clienteId ? s.reunioes.filter((r) => r.clienteId === clienteId) : []));
}

export function useTranscricaoPorReuniao(reuniaoId: string | undefined): Transcricao | undefined {
  return useMockDb((s) => s.transcricoes.find((t) => t.reuniaoId === reuniaoId));
}
