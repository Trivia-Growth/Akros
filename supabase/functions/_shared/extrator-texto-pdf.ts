// _shared/extrator-texto-pdf.ts — E07-S05 (US2). Extração de texto de PDF pesquisável, SEM
// biblioteca de parsing completa (nenhuma validada nesta sessão contra arquivo real — mesma
// ressalva de `pre-analise-pdf.ts`).
//
// SPEC_DEVIATION (tasks.md T013): extração por regex nos operadores de texto do PDF
// (`(texto) Tj`/`[...] TJ`), não um parser de PDF completo. Funciona bem para PDF gerado por
// editor de texto comum (Word→PDF, Google Docs→PDF); falha ou produz texto incompleto para PDF
// com fonte customizada/encoding complexo. Quando o resultado é curto demais para ter confiança,
// o cruzamento (US2 AC-2) marca "não disponível — requer revisão manual" em vez de inventar
// aderência sobre texto incompleto (FR-012) — a imprecisão da extração nunca é escondida como
// certeza.

const MIN_CARACTERES_CONFIAVEL = 80;

function decodificarLiteral(literal: string): string {
  // Strings de PDF usam \( \) \\ como escape e podem ter \ddd octal — cobre os casos comuns,
  // sem tentar decodificar CID fonts (fora de alcance desta extração simplificada).
  return literal
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(Number.parseInt(oct, 8)));
}

export interface TextoExtraido {
  texto: string;
  confiavel: boolean;
}

export function extrairTextoPdf(bytes: Uint8Array): TextoExtraido {
  const conteudo = new TextDecoder("latin1").decode(bytes);
  const partes: string[] = [];

  // (texto) Tj — string simples antes do operador de mostrar texto.
  for (const m of conteudo.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g)) {
    partes.push(decodificarLiteral(m[1]));
  }
  // [ (a) -200 (b) ] TJ — array de strings/ajustes de kerning; só as strings interessam.
  for (const bloco of conteudo.matchAll(/\[((?:[^\]]|\\.)*)\]\s*TJ/g)) {
    for (const m of bloco[1].matchAll(/\(((?:[^()\\]|\\.)*)\)/g)) {
      partes.push(decodificarLiteral(m[1]));
    }
  }

  const texto = partes.join(" ").replace(/\s+/g, " ").trim();
  return { texto, confiavel: texto.length >= MIN_CARACTERES_CONFIAVEL };
}
