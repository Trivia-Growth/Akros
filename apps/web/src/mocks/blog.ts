import type { Depoimento, PostBlog } from "@/features/site/domain/types";

export const posts: PostBlog[] = [
  {
    id: "post-1",
    slug: "requisitos-eb2-niw",
    titulo: "EB-2 NIW: requisitos essenciais para conquistar o Green Card sem patrocinador",
    resumo:
      "Entenda os critérios de elegibilidade e por que o National Interest Waiver pode dispensar uma oferta de emprego.",
    conteudo:
      "O EB-2 National Interest Waiver permite que profissionais com habilidades excepcionais solicitem residência permanente sem a necessidade de uma oferta de emprego, desde que demonstrem que seu trabalho beneficia o interesse nacional dos Estados Unidos. Os três critérios avaliados pela USCIS (padrão Dhanasar) são: (1) o empreendimento proposto tem mérito substancial e importância nacional; (2) o solicitante está bem posicionado para promover o empreendimento; (3) seria benéfico para os EUA dispensar os requisitos de oferta de emprego e certificação trabalhista.",
    categoria: "EB-2 NIW",
    publicadoEm: "2026-05-10T09:00:00-03:00",
  },
  {
    id: "post-2",
    slug: "onde-solicitar-visto-americano",
    titulo: "Visto para os EUA: aplicar de dentro ou fora do país?",
    resumo:
      "Entenda diferenças entre ajuste de status e processo consular antes de definir seu próximo passo.",
    conteudo:
      "A escolha entre aplicar do Brasil ou dos Estados Unidos pode influenciar prazos, etapas e estratégia. Para quem já está legalmente no país, o ajuste de status pode ser uma opção; em outros casos, o processo consular é o caminho adequado. Cada cenário exige análise individual.",
    categoria: "Processo",
    publicadoEm: "2026-04-22T09:00:00-03:00",
  },
  {
    id: "post-3",
    slug: "guia-residencia-legal-brasileiros",
    titulo: "Como morar legalmente nos Estados Unidos: guia para brasileiros",
    resumo:
      "Um ponto de partida para quem quer entender rotas legais para viver e trabalhar nos Estados Unidos.",
    conteudo:
      "Existem diferentes rotas para brasileiros que desejam morar legalmente nos Estados Unidos, incluindo vistos baseados em emprego, investimento, estudo e reunião familiar. A escolha correta depende de formação, histórico profissional, objetivos e momento de vida de cada pessoa.",
    categoria: "Imigração",
    publicadoEm: "2026-03-15T09:00:00-03:00",
  },
  {
    id: "post-4",
    slug: "green-card-sem-patrocinio-empregador",
    titulo: "Conquiste o Green Card sem empregador: tudo sobre o EB-2 NIW",
    resumo:
      "Saiba como o EB-2 NIW pode dispensar uma oferta de trabalho quando há benefício ao interesse nacional dos EUA.",
    conteudo:
      "Diferente de muitas categorias baseadas em emprego, o EB-2 NIW permite que o próprio profissional apresente a petição sem depender de uma empresa americana patrocinadora. Para isso, é necessário demonstrar qualificações e que o empreendimento proposto tem relevância para os Estados Unidos.",
    categoria: "EB-2 NIW",
    publicadoEm: "2026-02-08T09:00:00-03:00",
  },
];

export const depoimentos: Depoimento[] = [
  {
    id: "depoimento-1",
    nomeCliente: "Thais L.",
    tipoVisto: "EB-2 NIW",
    texto:
      "Assessoria completa, eficiente e transparente. Nosso EB-2 foi aprovado em seis meses e ficamos muito satisfeitos com o cuidado da equipe.",
  },
  {
    id: "depoimento-2",
    nomeCliente: "Mariana F.",
    tipoVisto: "EB-2 NIW",
    texto:
      "A excelência e o profissionalismo da assessoria trouxeram muita segurança para um processo que parecia desafiador.",
  },
  {
    id: "depoimento-3",
    nomeCliente: "Fábio V.",
    tipoVisto: "EB-2 NIW",
    texto:
      "Atendimento próximo, sério e humano. A confiança construída no processo fez toda diferença para a nossa decisão.",
  },
];
