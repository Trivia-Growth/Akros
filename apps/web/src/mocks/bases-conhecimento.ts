import type { FonteConhecimento } from "@/features/comunicacao/domain/types";

export const basesConhecimento: FonteConhecimento[] = [
  { id: "kb-visas", nome: "Guia de vistos Akros", tipo: "documento", status: "pronta", itens: 42 },
  { id: "kb-faq", nome: "FAQ de pré-venda", tipo: "faq", status: "pronta", itens: 28 },
  { id: "kb-site", nome: "Conteúdo do site", tipo: "url", status: "indexando", itens: 16 },
  {
    id: "kb-jornada",
    nome: "Manual da jornada do cliente",
    tipo: "base_interna",
    status: "pronta",
    itens: 35,
  },
];
