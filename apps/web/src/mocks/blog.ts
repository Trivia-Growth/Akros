import type { Depoimento, PostBlog } from "@/features/site/domain/types";

export const posts: PostBlog[] = [
  {
    id: "post-1",
    slug: "requisitos-eb2-niw",
    titulo: "Quais são os requisitos do EB-2 NIW?",
    resumo:
      "Entenda os três critérios que a USCIS avalia para conceder a dispensa de oferta de emprego no EB-2 NIW.",
    conteudo:
      "O EB-2 National Interest Waiver permite que profissionais com habilidades excepcionais solicitem residência permanente sem a necessidade de uma oferta de emprego, desde que demonstrem que seu trabalho beneficia o interesse nacional dos Estados Unidos. Os três critérios avaliados pela USCIS (padrão Dhanasar) são: (1) o empreendimento proposto tem mérito substancial e importância nacional; (2) o solicitante está bem posicionado para promover o empreendimento; (3) seria benéfico para os EUA dispensar os requisitos de oferta de emprego e certificação trabalhista.",
    categoria: "EB-2 NIW",
    publicadoEm: "2026-05-10T09:00:00-03:00",
  },
  {
    id: "post-2",
    slug: "onde-solicitar-visto-americano",
    titulo: "Onde solicitar o visto americano: consulado ou USCIS?",
    resumo: "Entenda a diferença entre processos consulares e petições feitas diretamente à USCIS.",
    conteudo:
      "Dependendo do tipo de visto e da situação do solicitante, o processo pode ser conduzido pelo consulado americano no país de origem (consular processing) ou diretamente pela USCIS, caso o solicitante já esteja legalmente nos Estados Unidos (ajuste de status). Cada caminho tem requisitos, prazos e taxas próprias.",
    categoria: "Processo",
    publicadoEm: "2026-04-22T09:00:00-03:00",
  },
  {
    id: "post-3",
    slug: "guia-residencia-legal-brasileiros",
    titulo: "Guia de residência legal para brasileiros nos EUA",
    resumo:
      "Um panorama dos principais caminhos legais para brasileiros que desejam morar nos EUA.",
    conteudo:
      "Existem diversos caminhos para brasileiros obterem residência legal nos Estados Unidos: vistos baseados em emprego (EB-1, EB-2, EB-2 NIW, EB-3), vistos de investidor (E-2), vistos temporários (H-1B, L-1) e vistos para talentos específicos (O-1, P-1). A escolha do caminho ideal depende do perfil profissional, formação e objetivos de cada pessoa.",
    categoria: "Imigração",
    publicadoEm: "2026-03-15T09:00:00-03:00",
  },
  {
    id: "post-4",
    slug: "green-card-sem-patrocinio-empregador",
    titulo: "Green Card sem patrocínio de empregador: é possível?",
    resumo: "Saiba como o EB-2 NIW dispensa a necessidade de um empregador americano patrocinador.",
    conteudo:
      "Diferente da maioria dos vistos de trabalho, o EB-2 NIW permite que o próprio profissional seja o solicitante da petição, sem depender de uma empresa americana disposta a patrociná-lo. Isso é possível porque a USCIS reconhece que, em certos casos, é do interesse nacional dispensar o processo de certificação trabalhista.",
    categoria: "EB-2 NIW",
    publicadoEm: "2026-02-08T09:00:00-03:00",
  },
];

export const depoimentos: Depoimento[] = [
  {
    id: "depoimento-1",
    nomeCliente: "Fernanda L.",
    tipoVisto: "EB-2 NIW",
    texto:
      "Processo extremamente bem conduzido, com atenção a cada detalhe. Meu I-140 foi aprovado em apenas 2 meses. Recomendo de olhos fechados!",
  },
  {
    id: "depoimento-2",
    nomeCliente: "Bruno C.",
    tipoVisto: "EB-2 NIW",
    texto:
      "Profissionalismo do início ao fim. A equipe sempre transparente sobre prazos e o que esperar em cada etapa.",
  },
  {
    id: "depoimento-3",
    nomeCliente: "Renata A.",
    tipoVisto: "EB-2 NIW",
    texto:
      "Me senti acompanhada em cada fase do processo. A Natalia e a equipe explicam tudo com muita clareza.",
  },
];
