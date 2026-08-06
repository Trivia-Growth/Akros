import type { Proposta } from "@/features/crm/domain/types";

export const propostas: Proposta[] = [
  {
    id: "proposta-rafael",
    leadOuClienteId: "lead-006",
    escopo:
      "Assessoria completa para petição EB-2 NIW: currículo especializado, Business Plan, cartas de recomendação e experiência, avaliação educacional, formulários e envio à USCIS.",
    tipoVisto: "EB-2 NIW",
    valor: 24000,
    moeda: "BRL",
    condicoes:
      "Entrada de R$ 8.000 + 4 parcelas de R$ 4.000. Taxa federal USCIS (US$ 1.015) à parte.",
    status: "enviada",
    criadoEm: "2026-07-15T10:00:00-03:00",
  },
];
