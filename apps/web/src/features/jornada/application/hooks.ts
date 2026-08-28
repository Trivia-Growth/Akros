import { container } from "@/app/di";
import { useClienteAtivo } from "@/features/demo/application/hooks";
import { useMockDb } from "@/mocks/store";
import { useMemo } from "react";
import type { Etapa, Fase, Jornada } from "../domain/types";
import { type PrevisaoConclusao, calcularPrevisao } from "./calcular-previsao";

export type { PrevisaoConclusao };

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

export async function enviarEtapaParaAvaliacao(clienteId: string, etapaId: string): Promise<void> {
  await container.jornada.enviarEtapaParaAvaliacao(clienteId, etapaId);
}

export async function aprovarEtapa(clienteId: string, etapaId: string): Promise<void> {
  await container.jornada.aprovarEtapa(clienteId, etapaId);
}

export async function devolverEtapaParaAjuste(
  clienteId: string,
  etapaId: string,
  motivo: string,
): Promise<void> {
  await container.jornada.devolverEtapaParaAjuste(clienteId, etapaId, motivo);
}

export async function liberarFase(clienteId: string, faseId: string): Promise<void> {
  await container.jornada.liberarFase(clienteId, faseId);
}

/** E09-S02 — previsão de conclusão pelo ritmo do cliente. */
export function usePrevisao(jornada: Jornada | undefined): PrevisaoConclusao | undefined {
  return useMemo(() => (jornada ? calcularPrevisao(jornada) : undefined), [jornada]);
}

/** E09-S01 AC-2 — separa etapas pendentes por responsável ("de quem é a bola"). */
export function useEtapasPorResponsavel(jornada: Jornada | undefined) {
  return useMemo(() => {
    const todas: Etapa[] = (jornada?.fases ?? []).flatMap((f) => f.etapas);
    const pendentes = todas.filter((e) => e.status === "pendente");
    return {
      cliente: pendentes.filter((e) => e.responsavel === "cliente"),
      akros: pendentes.filter((e) => e.responsavel === "akros"),
      terceiro: pendentes.filter((e) => e.responsavel === "terceiro"),
      uscis: pendentes.filter((e) => e.responsavel === "uscis"),
    };
  }, [jornada]);
}
