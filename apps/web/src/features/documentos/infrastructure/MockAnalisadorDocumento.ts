import { useMockDb } from "@/mocks/store";
import type { AnalisadorDocumentoPort } from "../application/ports";
import type { AnaliseDocumento, Documento, Lacuna, TipoDocumento } from "../domain/types";

const MOTOR = "mock-regras@1";

/** E07-S04 — regras do caso concreto citado pela Akros (carta de experiência × recomendação). */
const REGRAS_LACUNA: Partial<
  Record<TipoDocumento, { impeditivas: Record<string, string>; ressalvas: Record<string, string> }>
> = {
  carta_experiencia: {
    impeditivas: {
      emissor_empresa: "A carta precisa ser emitida pela empresa, não por um colega isolado.",
      periodo: "Falta o período de início e fim do vínculo.",
      cargo: "Falta o cargo ocupado.",
      responsabilidades: "Faltam as responsabilidades exercidas no cargo.",
      assinatura: "Falta a assinatura do responsável pela empresa.",
      contato_emissor: "Falta um contato do emissor para verificação.",
    },
    ressalvas: {
      papel_timbrado: "O documento não está em papel timbrado da empresa.",
      traducao_certificada:
        "Como o documento está em português, vai precisar de tradução certificada.",
    },
  },
  carta_recomendacao: {
    impeditivas: {
      identificacao_recomendante: "Falta identificar quem é o recomendante e sua credencial.",
      relacao_candidato: "Falta explicar a relação do recomendante com você.",
      avaliacao_concreta:
        "A carta precisa trazer uma avaliação concreta do seu trabalho, não só elogios genéricos.",
      assinatura: "Falta a assinatura do recomendante.",
    },
    ressalvas: {
      texto_generico:
        "O texto está genérico — um exemplo específico do seu trabalho fortalece a carta.",
    },
  },
};

const SUGESTAO_TIPO_INCORRETO: Partial<Record<string, string>> = {
  "carta_experiencia<-carta_recomendacao":
    "Este documento parece uma carta de recomendação (atesta a qualidade do trabalho), não uma carta de experiência (comprova tempo e cargo). São coisas diferentes — peça a carta de experiência à empresa.",
  "carta_recomendacao<-carta_experiencia":
    "Este documento parece uma carta de experiência (comprova tempo e cargo), não uma carta de recomendação (avalia a qualidade do trabalho). Peça a um profissional que te conhece uma carta de recomendação.",
};

const CTPS_SUGESTAO =
  "Este documento não tem valor para a imigração americana — carteira de trabalho comprova vínculo local, não a atuação profissional que a petição exige. Peça à empresa uma carta de experiência com cargo, período e responsabilidades.";

function novoId(prefixo: string): string {
  return `${prefixo}-${crypto.randomUUID().slice(0, 8)}`;
}

function construirParecer(
  documento: Documento,
  tipoEsperado: TipoDocumento,
): Omit<AnaliseDocumento, "documentoId" | "analisadoEm" | "motor"> {
  const tipoDetectado = documento.tipo;

  if (tipoDetectado === "carteira_trabalho") {
    return {
      tipoDetectado,
      tipoEsperado,
      aderencia: "tipo_incorreto",
      confianca: 0.95,
      lacunas: [],
      sugestoes: [CTPS_SUGESTAO],
    };
  }

  if (tipoDetectado !== tipoEsperado) {
    const chave = `${tipoEsperado}<-${tipoDetectado}`;
    const sugestao =
      SUGESTAO_TIPO_INCORRETO[chave] ??
      `Este documento parece ser do tipo "${tipoDetectado}", mas o requisito espera "${tipoEsperado}". Confira se é o documento certo para este item do checklist.`;
    return {
      tipoDetectado,
      tipoEsperado,
      aderencia: "tipo_incorreto",
      confianca: 0.85,
      lacunas: [],
      sugestoes: [sugestao],
    };
  }

  const regras = REGRAS_LACUNA[tipoEsperado];
  const faltando = documento.metadadosFixture?.faltando ?? [];
  const ressalvasFixture = documento.metadadosFixture?.ressalvas ?? [];

  if (!regras) {
    return {
      tipoDetectado,
      tipoEsperado,
      aderencia: faltando.length > 0 ? "atende_com_ressalva" : "atende",
      confianca: 0.7,
      lacunas: [],
      sugestoes:
        faltando.length > 0
          ? [
              "Este tipo de documento ainda não tem regra detalhada de análise — revisão humana recomendada.",
            ]
          : [],
    };
  }

  const lacunas: Lacuna[] = [
    ...faltando
      .filter((chave) => chave in regras.impeditivas)
      .map((chave) => ({
        id: novoId("lacuna"),
        gravidade: "impeditiva" as const,
        descricao: regras.impeditivas[chave],
      })),
    ...ressalvasFixture
      .filter((chave) => chave in regras.ressalvas)
      .map((chave) => ({
        id: novoId("lacuna"),
        gravidade: "recomendada" as const,
        descricao: regras.ressalvas[chave],
      })),
  ];

  const temImpeditiva = lacunas.some((l) => l.gravidade === "impeditiva");
  const temRessalva = lacunas.some((l) => l.gravidade === "recomendada");

  return {
    tipoDetectado,
    tipoEsperado,
    aderencia: temImpeditiva ? "nao_atende" : temRessalva ? "atende_com_ressalva" : "atende",
    confianca: temImpeditiva ? 0.9 : 0.85,
    lacunas,
    sugestoes: lacunas.map((l) => l.descricao),
  };
}

/**
 * Determinístico por desenho (ADR-0005 / E07-S01 AC-4): o "defeito" de cada documento é
 * declarado na fixture (`metadadosFixture`), nunca sorteado. Latência simulada de 2.5s —
 * a espera é parte do que está sendo demonstrado, não um detalhe a esconder.
 */
export class MockAnalisadorDocumento implements AnalisadorDocumentoPort {
  async analisar(input: {
    documentoId: string;
    tipoEsperado: TipoDocumento;
    objetivoRequisito: string;
  }): Promise<AnaliseDocumento> {
    const documento = useMockDb.getState().documentos.find((d) => d.id === input.documentoId);
    if (!documento) throw new Error(`Documento ${input.documentoId} não encontrado`);

    const parecer = construirParecer(documento, input.tipoEsperado);
    const analise: AnaliseDocumento = {
      ...parecer,
      documentoId: input.documentoId,
      analisadoEm: new Date().toISOString(),
      motor: MOTOR,
    };
    return new Promise((resolve) => setTimeout(() => resolve(analise), 2500));
  }
}
