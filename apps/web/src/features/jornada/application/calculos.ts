import type { Fase, Jornada } from "../domain/types";

export function calcularProgresso(jornada: Jornada | undefined): number {
  if (!jornada) return 0;
  const totalEtapas = jornada.fases.reduce((acc, fase) => acc + fase.etapas.length, 0);
  const concluidas = jornada.fases.reduce(
    (acc, fase) => acc + fase.etapas.filter((etapa) => etapa.status === "concluida").length,
    0,
  );
  return totalEtapas === 0 ? 0 : Math.round((concluidas / totalEtapas) * 100);
}

/** Fase corrente: em andamento, ou primeira liberada. */
export function obterFaseAtual(jornada: Jornada | undefined): Fase | undefined {
  if (!jornada) return undefined;
  return (
    jornada.fases.find((fase) => fase.status === "em_andamento") ??
    jornada.fases.find((fase) => fase.status === "liberada")
  );
}
