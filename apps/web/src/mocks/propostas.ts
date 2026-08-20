import type { Proposta } from "@/features/crm/domain/types";

export const propostas: Proposta[] = [
  {
    id: "proposta-rafael",
    leadOuClienteId: "lead-006",
    escopo:
      "Assessoria completa para petição EB-2 NIW: currículo especializado, Business Plan, cartas de recomendação e experiência, avaliação educacional, formulários e envio à USCIS.",
    itensEscopo: [
      "Currículo especializado (formato USCIS)",
      "Business Plan completo",
      "Cartas de recomendação e experiência",
      "Avaliação educacional (credential evaluation)",
      "Preenchimento e envio dos formulários à USCIS",
    ],
    tipoVisto: "EB-2 NIW",
    valor: 24000,
    moeda: "BRL",
    condicoes:
      "Entrada de R$ 8.000 + 4 parcelas de R$ 4.000. Taxa federal USCIS (US$ 1.015) à parte.",
    validoAte: "2026-08-30T23:59:59-03:00",
    status: "enviada",
    criadoEm: "2026-07-15T10:00:00-03:00",
  },
];
