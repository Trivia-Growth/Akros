// _shared/documento-rascunho.ts — E07-S05/US3. Rascunho de resposta ao cliente, calibrado pelo
// prazo/prioridade do contrato (research.md item 7). Depende do parecer já existir (US2) — nunca
// recalcula o parecer.
import { HttpError } from "./auth.ts";
import { chamarOpenRouter } from "./openrouter-generico.ts";
import { explicarErroIA } from "./openrouter.ts";
import type { Buscador } from "./canais/tipos.ts";

export interface DocumentoComParecer {
  clienteId: string;
  analise: { aderencia: string | null; lacunas: { descricao: string }[] } | null;
}

export interface ContratoDoCaso {
  prazoRespostaDiasUteis: number;
  prioridade: "padrao" | "prioritaria";
}

export interface IODocumentoRascunho {
  carregarDocumentoComParecer(documentoId: string): Promise<DocumentoComParecer | null>;
  carregarContratoAtivo(clienteId: string): Promise<ContratoDoCaso | null>;
  obterChaveOpenRouter(): Promise<{ apiKey: string; modelo: string } | null>;
  gravarRascunho(args: {
    documentoId: string;
    texto: string;
    prazoRespostaDiasUteisUsado: number;
    prioridadeUsada: "padrao" | "prioritaria";
  }): Promise<{ id: string; geradoEm: string }>;
  registrarChamadaIaDoDocumento(documentoId: string): Promise<void>;
}

function montarPrompt(lacunas: string[], prazoDiasUteis: number, prioridade: string): string {
  return [
    "Você escreve, em nome da equipe da Akros Immigration, um rascunho curto e acolhedor de",
    "resposta a um cliente sobre um documento enviado que precisa de ajuste.",
    `Pendências identificadas: ${lacunas.join("; ") || "nenhuma lacuna específica registrada"}.`,
    `Prazo de análise contratado pela Akros para este caso: ${prazoDiasUteis} dias úteis (prioridade: ${prioridade}).`,
    "Regras OBRIGATÓRIAS: nunca mencione prazo de decisão da USCIS; nunca prometa aprovação; tom",
    "calmo, sem alarmismo, mencionando o prazo contratual da Akros quando relevante para gerir expectativa.",
    "Responda só com o texto da mensagem, sem comentários adicionais.",
  ].join("\n");
}

export async function gerarRascunhoResposta(
  io: IODocumentoRascunho,
  buscador: Buscador,
  documentoId: string,
): Promise<{ id: string; documentoId: string; texto: string; prazoRespostaDiasUteisUsado: number; prioridadeUsada: "padrao" | "prioritaria"; geradoEm: string }> {
  const documento = await io.carregarDocumentoComParecer(documentoId);
  if (!documento) throw new HttpError(404, "Documento não encontrado");
  if (!documento.analise) throw new HttpError(409, "Documento ainda não tem parecer gerado");

  const contrato = await io.carregarContratoAtivo(documento.clienteId);
  if (!contrato) throw new HttpError(409, "Caso sem contrato ativo — não é possível calibrar o prazo");

  const chave = await io.obterChaveOpenRouter();
  if (!chave) throw new HttpError(409, "Chave de IA de apoio não configurada");

  const lacunas = documento.analise.lacunas.map((l) => l.descricao);
  let texto: string;
  try {
    texto = await chamarOpenRouter(
      buscador,
      chave.apiKey,
      chave.modelo,
      montarPrompt(lacunas, contrato.prazoRespostaDiasUteis, contrato.prioridade),
    );
  } catch (erro) {
    throw new HttpError(502, explicarErroIA(erro));
  }

  await io.registrarChamadaIaDoDocumento(documentoId);
  const gravado = await io.gravarRascunho({
    documentoId,
    texto,
    prazoRespostaDiasUteisUsado: contrato.prazoRespostaDiasUteis,
    prioridadeUsada: contrato.prioridade,
  });

  return {
    id: gravado.id,
    documentoId,
    texto,
    prazoRespostaDiasUteisUsado: contrato.prazoRespostaDiasUteis,
    prioridadeUsada: contrato.prioridade,
    geradoEm: gravado.geradoEm,
  };
}
