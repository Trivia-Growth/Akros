import type { Etapa, Jornada } from "../domain/types";

const FATOR_MIN = 0.7;
const FATOR_MAX = 3.0;
const MIN_ETAPAS_PARA_FATOR = 3;

export interface PrevisaoConclusao {
  /** Dias úteis restantes do processo interno, já ajustados pelo ritmo do cliente. */
  diasProcessoInterno: number;
  diasUscisMin: number;
  diasUscisMax: number;
  // SPEC_DEVIATION (E09-S02): diasProcessoInterno soma prazoMedioDiasUteis (dias úteis) e é
  // exibida junto da faixa da USCIS (dias corridos) sem conversão entre as duas unidades —
  // aproximação deliberada; a spec já marca a fórmula inteira como estimativa a validar.
  /** Faixa final (aproximação — ver nota acima). */
  diasOtimista: number;
  diasProvavel: number;
  fatorRitmo: number;
  dadosSuficientes: boolean;
}

function clamp(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

function diasEntre(inicio: string, fim: string): number {
  return Math.max(
    1,
    Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 86_400_000),
  );
}

interface EtapaComDadosDeRitmo extends Etapa {
  iniciadaEm: string;
  concluidaRealEm: string;
  prazoMedioDiasUteis: number;
}

function temDadosDeRitmo(etapa: Etapa): etapa is EtapaComDadosDeRitmo {
  return (
    etapa.status === "concluida" &&
    !!etapa.iniciadaEm &&
    !!etapa.concluidaRealEm &&
    !!etapa.prazoMedioDiasUteis
  );
}

/**
 * E09-S02 — pura, sem I/O. Faixa da USCIS é fixa por programa (não influenciável pelo cliente);
 * só o tempo do processo interno reage ao ritmo. Ver ADR e spec para a fórmula documentada.
 */
export function calcularPrevisao(
  jornada: Jornada,
  uscisDiasMin = 240,
  uscisDiasMax = 420,
): PrevisaoConclusao {
  const todasEtapas = jornada.fases.flatMap((f) => f.etapas);
  const pendentes = todasEtapas.filter((e) => e.status === "pendente");
  const concluidasComDados = todasEtapas.filter(temDadosDeRitmo);

  const dadosSuficientes = concluidasComDados.length >= MIN_ETAPAS_PARA_FATOR;

  let fatorRitmo = 1.0;
  if (dadosSuficientes) {
    const mediaEsperada =
      concluidasComDados.reduce((acc, e) => acc + e.prazoMedioDiasUteis, 0) /
      concluidasComDados.length;
    const mediaReal =
      concluidasComDados.reduce((acc, e) => acc + diasEntre(e.iniciadaEm, e.concluidaRealEm), 0) /
      concluidasComDados.length;
    fatorRitmo = mediaEsperada > 0 ? clamp(mediaReal / mediaEsperada, FATOR_MIN, FATOR_MAX) : 1.0;
  }

  const baseDiasProcesso = pendentes.reduce((acc, e) => acc + (e.prazoMedioDiasUteis ?? 0), 0);
  const diasProcessoInterno = Math.round(baseDiasProcesso * fatorRitmo);

  return {
    diasProcessoInterno,
    diasUscisMin: uscisDiasMin,
    diasUscisMax: uscisDiasMax,
    diasOtimista: diasProcessoInterno + uscisDiasMin,
    diasProvavel: diasProcessoInterno + uscisDiasMax,
    fatorRitmo,
    dadosSuficientes,
  };
}

/** E09-S01 AC-4 — tempo parado, atribuído ao responsável atual da etapa. */
export function diasParado(etapa: Etapa, agora: Date = new Date()): number {
  if (!etapa.desdeEm || etapa.status === "concluida") return 0;
  return Math.max(
    0,
    Math.round((agora.getTime() - new Date(etapa.desdeEm).getTime()) / 86_400_000),
  );
}
