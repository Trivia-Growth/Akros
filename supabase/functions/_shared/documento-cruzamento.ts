// _shared/documento-cruzamento.ts — E07-S05/US2. Cruzamento do texto do documento (mascarado)
// com o requisito do visto, via OpenRouter (chave exclusiva desta finalidade, nunca a do agente
// de atendimento — research.md item 6). Mesmo padrão porta/adapter das demais features: toda a
// decisão mora aqui, testável com fakes; `documento-ocr-cruzamento/index.ts` monta os adapters.
//
// SPEC_DEVIATION (tasks.md T013): `objetivoRequisito` usado no prompt é o `tipo` do documento
// (TipoDocumento), não o texto rico do catálogo de programa (`RequisitoDocumento.objetivo`,
// `programas.programas.fases_template` jsonb) — navegar esse jsonb por requisito_id é trabalho
// real que não coube nesta sessão. O parecer fica mais genérico que o que `AnalisadorDocumentoPort`
// já produz hoje via mock (que já é mais rico com `objetivoRequisito` literal). Próxima iteração:
// resolver o objetivo real a partir do catálogo antes de montar o prompt.
import { HttpError } from "./auth.ts";
import { extrairTextoPdf } from "./extrator-texto-pdf.ts";
import { mascararPii, type ValorConhecido } from "./mascaramento-pii.ts";
import { chamarOpenRouter } from "./openrouter-generico.ts";
import { explicarErroIA } from "./openrouter.ts";
import type { Buscador } from "./canais/tipos.ts";

export interface DocumentoParaCruzamento {
  id: string;
  clienteId: string;
  tipo: string;
  status: string;
  iaApoioAtiva: boolean;
}

export interface VersaoRecebida {
  id: string;
  motivoProblema: string | null;
}

export interface IODocumentoCruzamento {
  carregarDocumento(documentoId: string): Promise<DocumentoParaCruzamento | null>;
  carregarUltimaVersaoRecebida(documentoId: string): Promise<VersaoRecebida | null>;
  baixarBytes(versaoId: string): Promise<Uint8Array>;
  valoresConhecidosDoCaso(clienteId: string): Promise<ValorConhecido[]>;
  obterChaveOpenRouter(): Promise<{ apiKey: string; modelo: string } | null>;
  gravarParecer(documentoId: string, parecer: ParecerCruzamento): Promise<void>;
  registrarChamadaIa(versaoId: string): Promise<void>;
}

export interface ParecerCruzamento {
  aderencia: "atende" | "atende_com_ressalva" | "nao_atende" | "tipo_incorreto" | null;
  confianca: number;
  lacunas: { id: string; gravidade: "impeditiva" | "recomendada"; descricao: string }[];
  sugestoes: string[];
  motivoIndisponivel?: string;
  analisadoEm: string;
  motor: string;
}

const MOTOR = "openrouter@1";

function montarPrompt(tipoDocumento: string, textoMascarado: string): string {
  return [
    "Você analisa um documento de imigração para a Akros Immigration (vistos EB-2 NIW e afins).",
    `Tipo de documento esperado: ${tipoDocumento}.`,
    "O texto abaixo já teve dados pessoais identificáveis substituídos por marcadores como [NOME_1] — nunca tente adivinhar o valor original.",
    "Responda SOMENTE em JSON, no formato exato:",
    '{"aderencia":"atende"|"atende_com_ressalva"|"nao_atende"|"tipo_incorreto","confianca":0 a 1,"lacunas":[{"gravidade":"impeditiva"|"recomendada","descricao":"..."}],"sugestoes":["..."]}',
    "Nunca decida nada sozinho — isto é um parecer de apoio, a decisão final é humana.",
    "--- TEXTO DO DOCUMENTO (mascarado) ---",
    textoMascarado.slice(0, 8000),
  ].join("\n");
}

function parsearRespostaIa(resposta: string): Omit<ParecerCruzamento, "analisadoEm" | "motor"> {
  const bruto: unknown = JSON.parse(resposta.trim().replace(/^```json\s*|```$/g, ""));
  const obj = bruto as Record<string, unknown>;
  const aderenciasValidas = ["atende", "atende_com_ressalva", "nao_atende", "tipo_incorreto"];
  const aderencia = aderenciasValidas.includes(obj.aderencia as string)
    ? (obj.aderencia as ParecerCruzamento["aderencia"])
    : null;
  const confianca = typeof obj.confianca === "number" ? obj.confianca : 0;
  const lacunas: ParecerCruzamento["lacunas"] = Array.isArray(obj.lacunas)
    ? obj.lacunas.flatMap((l, i) => {
        const lacuna = l as Record<string, unknown>;
        const descricao = typeof lacuna.descricao === "string" ? lacuna.descricao : null;
        const gravidade: "impeditiva" | "recomendada" =
          lacuna.gravidade === "impeditiva" ? "impeditiva" : "recomendada";
        return descricao ? [{ id: `lacuna-${i + 1}`, gravidade, descricao }] : [];
      })
    : [];
  const sugestoes = Array.isArray(obj.sugestoes)
    ? obj.sugestoes.filter((s): s is string => typeof s === "string")
    : [];
  return { aderencia, confianca, lacunas, sugestoes };
}

export async function cruzarComRequisito(
  io: IODocumentoCruzamento,
  buscador: Buscador,
  documentoId: string,
): Promise<ParecerCruzamento> {
  const documento = await io.carregarDocumento(documentoId);
  if (!documento) throw new HttpError(404, "Documento não encontrado");
  if (!documento.iaApoioAtiva) throw new HttpError(422, "IA de apoio desligada para este caso");

  const versao = await io.carregarUltimaVersaoRecebida(documentoId);
  if (!versao) throw new HttpError(409, "Nenhuma versão recebida para este documento ainda");
  if (versao.motivoProblema) {
    return {
      aderencia: null,
      confianca: 0,
      lacunas: [],
      sugestoes: [],
      motivoIndisponivel: "documento_ilegivel_na_pre_analise",
      analisadoEm: new Date().toISOString(),
      motor: MOTOR,
    };
  }

  const bytes = await io.baixarBytes(versao.id);
  const extraido = extrairTextoPdf(bytes);
  if (!extraido.confiavel) {
    return {
      aderencia: null,
      confianca: 0,
      lacunas: [],
      sugestoes: [],
      motivoIndisponivel: "texto_nao_extraido_com_confianca",
      analisadoEm: new Date().toISOString(),
      motor: MOTOR,
    };
  }

  const conhecidos = await io.valoresConhecidosDoCaso(documento.clienteId);
  const textoMascarado = mascararPii(extraido.texto, conhecidos);

  const chave = await io.obterChaveOpenRouter();
  if (!chave) {
    return {
      aderencia: null,
      confianca: 0,
      lacunas: [],
      sugestoes: [],
      motivoIndisponivel: "chave_openrouter_nao_configurada",
      analisadoEm: new Date().toISOString(),
      motor: MOTOR,
    };
  }

  let respostaIa: string;
  try {
    respostaIa = await chamarOpenRouter(buscador, chave.apiKey, chave.modelo, montarPrompt(documento.tipo, textoMascarado));
  } catch (erro) {
    return {
      aderencia: null,
      confianca: 0,
      lacunas: [],
      sugestoes: [],
      motivoIndisponivel: explicarErroIA(erro),
      analisadoEm: new Date().toISOString(),
      motor: MOTOR,
    };
  }
  await io.registrarChamadaIa(versao.id);

  let parecer: Omit<ParecerCruzamento, "analisadoEm" | "motor">;
  try {
    parecer = parsearRespostaIa(respostaIa);
  } catch {
    return {
      aderencia: null,
      confianca: 0,
      lacunas: [],
      sugestoes: [],
      motivoIndisponivel: "resposta_da_ia_em_formato_invalido",
      analisadoEm: new Date().toISOString(),
      motor: MOTOR,
    };
  }

  const resultado: ParecerCruzamento = { ...parecer, analisadoEm: new Date().toISOString(), motor: MOTOR };
  await io.gravarParecer(documentoId, resultado);
  return resultado;
}
