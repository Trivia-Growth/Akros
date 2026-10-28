import type { Programa } from "@/features/programas/domain/types";

/**
 * Programa Visto Religioso R / EB-4 (E06-S02). Segundo programa — prova de que a arquitetura
 * de E06-S01 escala sem código novo (ADR-0004). Conteúdo é PROPOSTA razoável, NÃO validada
 * pela Akros — precisa de revisão da Natalia e da Dra. Denise antes de uso com cliente real
 * (ver Notas de implementação em specs/E06-S02-programa-religioso/spec.md).
 */
export const programaReligiosoREb4: Programa = {
  id: "programa-religioso-r-eb4",
  codigo: "religioso-r-eb4",
  nome: "Visto Religioso (R / EB-4)",
  categoria: "imigrante",
  sujeito: "organizacao",
  versao: "1.0",
  ativo: true,
  fasesTemplate: [
    {
      id: "rel-fase-0",
      ordem: 0,
      titulo: "Introdução",
      descricao: "Boas-vindas, canais de comunicação e o que a instituição precisa separar.",
      etapas: [
        {
          id: "rel-intro-1",
          titulo: "Ler o manual da instituição",
          descricao: "Canais de comunicação e regras de envio de documentos institucionais.",
          responsavel: "cliente",
          responsavelDetalhe: "Representante da instituição",
        },
      ],
    },
    {
      id: "rel-fase-1",
      ordem: 1,
      titulo: "Documentação da instituição",
      descricao:
        "Estatuto, isenção fiscal, extratos e demonstrativos, prova de atividade religiosa.",
      etapas: [
        {
          id: "rel-f1-1",
          titulo: "Estatuto e comprovante de isenção fiscal",
          descricao: "Documentos institucionais que comprovam a natureza da organização.",
          responsavel: "cliente",
          responsavelDetalhe: "Representante da instituição",
          documentosRequeridos: ["req-rel-estatuto", "req-rel-isencao"],
        },
        {
          id: "rel-f1-2",
          titulo: "Extratos bancários e demonstrativos financeiros",
          descricao:
            "Comprovação financeira da instituição. Dado sensível, tratado pelo canal registrável.",
          prazoMedioDiasUteis: 10,
          responsavel: "cliente",
          responsavelDetalhe: "Representante da instituição",
          documentosRequeridos: ["req-rel-extrato", "req-rel-demonstrativo"],
        },
      ],
    },
    {
      id: "rel-fase-2",
      ordem: 2,
      titulo: "Documentação do beneficiário",
      descricao: "Vínculo religioso mínimo de 2 anos, formação/ordenação, experiência.",
      etapas: [
        {
          id: "rel-f2-1",
          titulo: "Comprovação de vínculo religioso",
          descricao: "Prova de atuação religiosa contínua nos últimos 2 anos.",
          prazoMedioDiasUteis: 10,
          responsavel: "terceiro",
          responsavelDetalhe: "Instituição religiosa de origem",
          documentosRequeridos: ["req-rel-vinculo"],
        },
      ],
    },
    {
      id: "rel-fase-3",
      ordem: 3,
      titulo: "Oferta e formulários",
      descricao: "Carta de oferta da instituição, formulários USCIS, taxas.",
      etapas: [
        {
          id: "rel-f3-1",
          titulo: "Carta de oferta da instituição patrocinadora",
          descricao: "Documento formal da instituição nos EUA oferecendo a posição.",
          responsavel: "cliente",
          responsavelDetalhe: "Instituição patrocinadora nos EUA",
        },
        {
          id: "rel-f3-2",
          titulo: "Formulários USCIS e taxa federal",
          descricao: "Preenchimento e pagamento da taxa correspondente.",
          responsavel: "cliente",
        },
      ],
    },
    {
      id: "rel-fase-4",
      ordem: 4,
      titulo: "Envio e acompanhamento",
      descricao: "Revisão final, envio rastreado, acompanhamento de RFE.",
      etapas: [
        {
          id: "rel-f4-1",
          titulo: "Revisão final e envio à USCIS",
          descricao: "Aprovação formal e envio com rastreamento.",
          responsavel: "akros",
        },
      ],
    },
    {
      id: "rel-fase-5",
      ordem: 5,
      titulo: "Pós-aprovação e Relocation",
      descricao: "Acompanhamento da decisão, consular processing e preparação para a mudança.",
      etapas: [
        {
          id: "rel-f5-1",
          titulo: "Acompanhamento da decisão USCIS",
          descricao: "Monitoramento de RFE ou aprovação.",
          responsavel: "uscis",
        },
        {
          id: "rel-f5-2",
          titulo: "Preparação para relocation",
          descricao: "Suporte para a mudança e instalação nos Estados Unidos.",
          responsavel: "cliente",
        },
      ],
    },
  ],
  documentosExigidos: [
    {
      id: "req-rel-estatuto",
      faseTemplateId: "rel-fase-1",
      tipo: "estatuto_instituicao",
      titulo: "Estatuto da instituição",
      objetivo: "Comprovar a natureza e a estrutura da organização religiosa.",
      obrigatorio: true,
      emitidoPor: "instituicao",
    },
    {
      id: "req-rel-isencao",
      faseTemplateId: "rel-fase-1",
      tipo: "comprovante_isencao_fiscal",
      titulo: "Comprovante de isenção fiscal",
      objetivo: "Comprovar o status de isenção fiscal (equivalente a 501(c)(3)).",
      obrigatorio: true,
      emitidoPor: "instituicao",
    },
    {
      id: "req-rel-extrato",
      faseTemplateId: "rel-fase-1",
      tipo: "extrato_bancario",
      titulo: "Extratos bancários da instituição",
      objetivo: "Comprovar capacidade financeira de sustentar o beneficiário.",
      obrigatorio: true,
      emitidoPor: "instituicao",
    },
    {
      id: "req-rel-demonstrativo",
      faseTemplateId: "rel-fase-1",
      tipo: "demonstrativo_financeiro",
      titulo: "Demonstrativo financeiro",
      objetivo: "Detalhar receitas e despesas da instituição.",
      obrigatorio: true,
      emitidoPor: "instituicao",
    },
    {
      id: "req-rel-vinculo",
      faseTemplateId: "rel-fase-2",
      tipo: "carta_experiencia",
      titulo: "Comprovação de vínculo religioso",
      objetivo: "Comprovar 2 anos de atuação religiosa contínua antes do pedido.",
      obrigatorio: true,
      emitidoPor: "terceiro_certificado",
    },
  ],
};
