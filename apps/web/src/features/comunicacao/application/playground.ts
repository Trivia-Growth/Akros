// Playground do agente (E13-S14): funções puras. A rede e o estado ficam no componente.

export type AutorTeste = "cliente" | "agente_ia";

export interface MensagemTeste {
  id: string;
  autor: AutorTeste;
  texto: string;
  /** Só nas respostas do agente. */
  meta?: {
    tipo: "resposta" | "handoff";
    modelo: string | null;
    ms: number;
    custo: number | null;
  };
}

export interface RespostaPlayground {
  tipo: "resposta" | "handoff";
  resposta: string;
  custo: number | null;
  modelo: string | null;
  ms: number;
  instrucoes: string;
}

/** O servidor aceita até 20 mensagens de histórico; mandamos as mais recentes. */
export const MAX_HISTORICO = 20;

export function corpoPlayground(agenteId: string, historico: MensagemTeste[], texto: string) {
  return {
    agenteId,
    mensagens: historico.slice(-MAX_HISTORICO).map(({ autor, texto: t }) => ({ autor, texto: t })),
    texto: texto.trim(),
  };
}

/** Mensagens típicas de um lead de imigração: servem para estressar o agente sem pensar no que digitar. */
export const SUGESTOES: readonly string[] = [
  "Oi, queria entender como funciona o visto EB-2 NIW",
  "Quanto custa e quanto tempo demora?",
  "Sou engenheiro de software com 8 anos de experiência. Eu me qualifico?",
  "Meu processo está atrasado, o que eu faço?",
  "Posso marcar uma consulta amanhã às 15h?",
  "Quero falar com um advogado",
  "Vocês garantem a aprovação?",
  "Mande o link do pagamento",
];

export function custoFormatado(custo: number | null): string | null {
  if (custo === null) return null;
  return `US$ ${custo.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

export function duracaoFormatada(ms: number): string {
  return ms < 1000
    ? `${ms} ms`
    : `${(ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;
}
