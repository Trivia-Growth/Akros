import type { Etapa, Fase } from "@/features/jornada/domain/types";

/**
 * Conteúdo real das 6 fases (Introdução + Fase 1..5), extraído de
 * manual-cliente-eb2-niw-utf8-links-corrigidos-v2.html + docs/PROJECT.md.
 * Todas as fases nascem "bloqueada" exceto a Introdução ("liberada") — o admin
 * libera as demais progressivamente (gate central, ver E03-S03).
 */
export function criarFasesTemplate(): Fase[] {
  return [
    {
      id: "fase-0",
      ordem: 0,
      titulo: "Introdução",
      descricao: "Boas-vindas, canais de comunicação e regras de envio de documentos.",
      status: "liberada",
      etapas: etapa([
        [
          "intro-1",
          "Ler o manual do cliente",
          "Conheça os canais de comunicação, regras de envio de documentos e traduções certificadas.",
        ],
        [
          "intro-2",
          "Confirmar leitura",
          "Confirme que leu e entendeu as regras antes de avançar para a Fase 1.",
        ],
      ]),
    },
    {
      id: "fase-1",
      ordem: 1,
      titulo: "Documentação e Currículo",
      descricao: "Contrato, kick-off, currículo especializado e documentos comprobatórios.",
      status: "bloqueada",
      etapas: etapa([
        [
          "f1-1",
          "Formalização do contrato e pagamento inicial",
          "Assinatura eletrônica do contrato de prestação de serviços e pagamento da entrada.",
        ],
        [
          "f1-2",
          "Reunião de início do processo (Kick-off)",
          "Reunião inicial para tratar dos documentos da Fase 1.",
        ],
        [
          "f1-3",
          "Elaboração do currículo especializado",
          "Currículo estruturado para evidenciar contribuições profissionais e qualificações excepcionais.",
          10,
        ],
        [
          "f1-4",
          "Organização dos documentos comprobatórios",
          "Formação acadêmica, certificados, licenças profissionais, associações e reconhecimentos.",
          undefined,
          [
            "Diploma + histórico escolar",
            "Certificados e especializações",
            "Licença/certificação profissional",
            "Associações profissionais",
            "Reconhecimentos e contribuições",
          ],
        ],
      ]),
    },
    {
      id: "fase-2",
      ordem: 2,
      titulo: "Business Plan e Cartas",
      descricao:
        "Checkpoint I, Business Plan, cartas de recomendação e experiência, avaliação educacional.",
      status: "bloqueada",
      etapas: etapa([
        [
          "f2-1",
          "Reunião de alinhamento (Checkpoint I)",
          "Apresentação dos próximos documentos da Fase 2.",
        ],
        [
          "f2-2",
          "Plano de negócios (Business Plan)",
          "Plano detalhado do projeto nos EUA, em parceria com a Scopimos.",
        ],
        [
          "f2-3",
          "Cartas de recomendação",
          "5 recomendantes atestam qualificação e resultados. Assinaturas manuscritas.",
          15,
        ],
        [
          "f2-4",
          "Cartas de comprovação de experiência profissional",
          "Comprovam tempo de atuação e responsabilidades em cada empresa.",
          10,
        ],
        [
          "f2-5",
          "Avaliação educacional (Educational Evaluation)",
          "Equivalência da formação acadêmica ao sistema dos EUA.",
          15,
        ],
      ]),
    },
    {
      id: "fase-3",
      ordem: 3,
      titulo: "Viabilidade Econômica e Formulários",
      descricao: "Checkpoint II, comprovação de viabilidade, questionários e taxa federal USCIS.",
      status: "bloqueada",
      etapas: etapa([
        [
          "f3-1",
          "Reunião de alinhamento (Checkpoint II)",
          "Apresentação dos documentos da Fase 3.",
        ],
        [
          "f3-2",
          "Comprovação de viabilidade econômica",
          "Recursos próprios, patrimônio, investidores e comprometimento com abertura da empresa.",
        ],
        [
          "f3-3",
          "Questionários e pagamento da taxa federal",
          "Formulários I-140 e ETA. Taxa USCIS: US$ 1.015.",
        ],
      ]),
    },
    {
      id: "fase-4",
      ordem: 4,
      titulo: "Finalização e Envio à USCIS",
      descricao: "Carta de suporte (Petition Letter), revisão final e envio rastreado.",
      status: "bloqueada",
      etapas: etapa([
        [
          "f4-1",
          "Elaboração da carta de suporte",
          "Petition Letter consolida a trajetória e fundamenta o interesse nacional.",
        ],
        [
          "f4-2",
          "Revisão final pelo cliente e envio à USCIS",
          "Aprovação formal do cliente e envio por correio com rastreamento.",
        ],
      ]),
    },
    {
      id: "fase-5",
      ordem: 5,
      titulo: "Pós-aprovação e Relocation",
      descricao:
        "Acompanhamento da decisão USCIS, consular processing/ajuste de status e mudança para os EUA.",
      status: "bloqueada",
      etapas: etapa([
        [
          "f5-1",
          "Acompanhamento da decisão USCIS",
          "Monitoramento de RFE (pedido de evidência adicional) ou aprovação.",
        ],
        [
          "f5-2",
          "Consular processing / ajuste de status",
          "Definição do caminho conforme o cliente esteja no Brasil ou nos EUA.",
        ],
        [
          "f5-3",
          "Preparação para relocation",
          "Suporte para a mudança e instalação nos Estados Unidos.",
        ],
      ]),
    },
  ];
}

function etapa(items: [string, string, string, number?, string[]?][]): Etapa[] {
  return items.map(([id, titulo, descricao, prazoMedioDiasUteis, documentosRequeridos]) => ({
    id,
    titulo,
    descricao,
    status: "pendente",
    prazoMedioDiasUteis,
    documentosRequeridos,
  }));
}
