// _shared/pre-analise-pdf.ts — E07-S05 (US1, research.md item 3). Checagens locais de
// legibilidade/qualidade, SEM qualquer chamada de rede externa (FR-001). Nunca envia o arquivo
// a lugar nenhum — só lê os bytes já em memória (vindos do Storage/OneDrive da própria Akros).
//
// SPEC_DEVIATION (registrada em tasks.md T006): a aproximação de "resolução suficiente" por DPI
// efetivo descrita no research.md item 3 exigiria decodificar a imagem embutida no PDF — sem
// biblioteca de imagem validada nesta sessão (sem acesso a arquivo real para testar), a v1 usa
// bytes-por-página como proxy grosseiro. Página de boa qualidade tende a pesar mais por página
// que uma foto de baixa resolução comprimida — não é uma medida de resolução real, é dívida
// técnica registrada em docs/SECURITY_DEBT.md.

import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

export interface ResultadoPreAnalise {
  paginaCompleta: boolean;
  resolucaoSuficiente: boolean;
  tipoConteudo: "texto_pesquisavel" | "imagem_escaneada";
  motivoProblema?: string;
}

// Dimensões em pontos (72 por polegada) — A4 e Letter, com folga de 5% para tolerar PDFs gerados
// por scanners que não batem exatamente.
const DIMENSOES_ACEITAS = [
  { largura: 595, altura: 842 }, // A4
  { largura: 612, altura: 792 }, // Letter
];
const TOLERANCIA = 0.05;

function paginaTemDimensaoCoerente(larguraPt: number, alturaPt: number): boolean {
  return DIMENSOES_ACEITAS.some(
    (ref) =>
      Math.abs(larguraPt - ref.largura) / ref.largura <= TOLERANCIA &&
      Math.abs(alturaPt - ref.altura) / ref.altura <= TOLERANCIA,
  );
}

/** Heurística crua: PDF com camada de texto real traz os operadores `Tj`/`TJ` no stream de
 *  conteúdo; puramente escaneado (só imagem) não traz. Falsos positivos/negativos são possíveis
 *  — por isso o resultado é "melhor esforço", nunca a única fonte de decisão (FR-012 mantém a
 *  revisão humana como caminho sempre disponível). */
function temCamadaDeTexto(bytes: Uint8Array): boolean {
  // Procura o padrão ASCII " Tj" ou " TJ" nos primeiros ~2MB do arquivo — suficiente para a
  // maioria dos documentos desta feature (cartas, formulários), sem decodificar o PDF inteiro.
  const amostra = bytes.subarray(0, Math.min(bytes.length, 2 * 1024 * 1024));
  const texto = new TextDecoder("latin1").decode(amostra);
  return / Tj\b| TJ\b/.test(texto);
}

export async function preAnalisarPdf(bytes: Uint8Array): Promise<ResultadoPreAnalise> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch {
    return {
      paginaCompleta: false,
      resolucaoSuficiente: false,
      tipoConteudo: "imagem_escaneada",
      motivoProblema: "arquivo_corrompido_ou_ilegivel",
    };
  }

  const paginas = doc.getPages();
  if (paginas.length === 0) {
    return {
      paginaCompleta: false,
      resolucaoSuficiente: false,
      tipoConteudo: "imagem_escaneada",
      motivoProblema: "sem_paginas",
    };
  }

  const primeira = paginas[0];
  const { width, height } = primeira.getSize();
  const paginaCompleta = paginaTemDimensaoCoerente(width, height);

  const bytesPorPagina = bytes.length / paginas.length;
  // Proxy grosseiro (ver SPEC_DEVIATION no topo do arquivo) — abaixo de 20KB/página é quase
  // sempre texto vetorial leve ou imagem muito comprimida/baixa resolução.
  const resolucaoSuficiente = bytesPorPagina >= 20_000;

  const tipoConteudo: ResultadoPreAnalise["tipoConteudo"] = temCamadaDeTexto(bytes)
    ? "texto_pesquisavel"
    : "imagem_escaneada";

  if (paginaCompleta && resolucaoSuficiente) {
    return { paginaCompleta, resolucaoSuficiente, tipoConteudo };
  }

  const motivo = !paginaCompleta
    ? "pagina_incompleta_ou_cortada"
    : "resolucao_insuficiente";

  return { paginaCompleta, resolucaoSuficiente, tipoConteudo, motivoProblema: motivo };
}
