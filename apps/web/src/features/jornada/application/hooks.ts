import { container } from "@/app/di";
import { useClienteAtivo } from "@/features/demo/application/hooks";
import { useMockDb } from "@/mocks/store";
import type { Fase, Jornada } from "../domain/types";

/** Jornada reativa do cliente ativo (impersonado). */
export function useJornadaAtiva(): Jornada | undefined {
  const cliente = useClienteAtivo();
  const jornadas = useMockDb((s) => s.jornadas);
  return jornadas.find((j) => j.clienteId === cliente?.id);
}

export function calcularProgresso(jornada: Jornada | undefined): number {
  if (!jornada) return 0;
  const totalEtapas = jornada.fases.reduce((acc, f) => acc + f.etapas.length, 0);
  const concluidas = jornada.fases.reduce(
    (acc, f) => acc + f.etapas.filter((e) => e.status === "concluida").length,
    0,
  );
  return totalEtapas === 0 ? 0 : Math.round((concluidas / totalEtapas) * 100);
}

/** Fase "corrente": a primeira em_andamento; se nenhuma, a primeira liberada. */
export function obterFaseAtual(jornada: Jornada | undefined): Fase | undefined {
  if (!jornada) return undefined;
  return (
    jornada.fases.find((f) => f.status === "em_andamento") ??
    jornada.fases.find((f) => f.status === "liberada")
  );
}

export async function concluirEtapa(clienteId: string, etapaId: string): Promise<void> {
  await container.jornada.concluirEtapa(clienteId, etapaId);
}

export async function liberarFase(clienteId: string, faseId: string): Promise<void> {
  await container.jornada.liberarFase(clienteId, faseId);
}
