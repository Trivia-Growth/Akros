import type { PerfilLead } from "@/shared/contracts/lead";

export type TipoPerguntaRoteiro = "texto" | "numero" | "opcoes" | "sim_nao";

export interface PerguntaRoteiro {
  id: string;
  texto: string;
  campo: keyof PerfilLead | "nome";
  tipo: TipoPerguntaRoteiro;
  opcoes?: string[];
}

/**
 * FICTÍCIO / MOCKADO DE PROPÓSITO (E11-S01) — dá o norte de como a qualificação conversacional
 * vai se comportar (uma pergunta por vez, retomada, perfil sendo montado). NÃO é o formulário
 * real da Akros (~10 perguntas hoje enviadas por link). Pedir o roteiro real antes de usar fora
 * de demo — ver Notas de implementação em specs/E11-S01-qualificacao-whatsapp/spec.md.
 */
export const roteiroQualificacaoMock: PerguntaRoteiro[] = [
  {
    id: "nome",
    texto: "Antes de começar, qual o seu nome completo?",
    campo: "nome",
    tipo: "texto",
  },
  {
    id: "formacao",
    texto: "Qual seu nível de formação?",
    campo: "formacao",
    tipo: "opcoes",
    opcoes: ["medio", "superior", "pos", "mestrado", "doutorado"],
  },
  {
    id: "area",
    texto: "Em que área você atua profissionalmente?",
    campo: "areaAtuacao",
    tipo: "texto",
  },
  {
    id: "anos_exp",
    texto: "Quantos anos de experiência você tem nessa área?",
    campo: "anosExperiencia",
    tipo: "numero",
  },
  {
    id: "esta_eua",
    texto: "Você já está nos Estados Unidos ou ainda no Brasil?",
    campo: "estaNosEUA",
    tipo: "sim_nao",
  },
  {
    id: "familia",
    texto: "Pretende levar cônjuge e/ou filhos no processo?",
    campo: "familia",
    tipo: "texto",
  },
  {
    id: "prazo",
    texto: "Você tem algum prazo em mente para iniciar a mudança?",
    campo: "prazoDesejado",
    tipo: "texto",
  },
  {
    id: "budget",
    texto: "Para eu te indicar a melhor opção, qual faixa de investimento você tem em mente hoje?",
    campo: "faixaBudget",
    tipo: "opcoes",
    opcoes: ["ate_15k", "15k_30k", "30k_50k", "acima_50k", "prefiro_nao_informar"],
  },
  {
    id: "momento",
    texto: "Você já decidiu seguir com a imigração ou ainda está pesquisando?",
    campo: "momentoVida",
    tipo: "opcoes",
    opcoes: ["explorando", "decidido_sem_prazo", "decidido_com_prazo", "urgente"],
  },
];

/**
 * E11-S01 AC-2 — interpreta resposta livre e mapeia para uma opção válida. Heurística simples
 * por palavra-chave; um adapter real usaria NLU. Retorna null quando não reconhece (o chamador
 * deve então pedir confirmação em vez de assumir).
 */
export function mapearRespostaLivre(pergunta: PerguntaRoteiro, textoLivre: string): string | null {
  const normalizado = textoLivre.trim().toLowerCase();
  if (pergunta.tipo === "sim_nao") {
    if (/(sim|já estou|ja estou|yes)/.test(normalizado)) return "sim";
    if (/(não|nao|ainda não|ainda nao|no)/.test(normalizado)) return "não";
    return null;
  }
  if (pergunta.tipo === "opcoes" && pergunta.opcoes) {
    const porInclusao = pergunta.opcoes.find((op) => normalizado.includes(op.replace(/_/g, " ")));
    if (porInclusao) return porInclusao;
    return null;
  }
  return normalizado.length > 0 ? textoLivre.trim() : null;
}
