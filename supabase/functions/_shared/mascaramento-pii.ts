// _shared/mascaramento-pii.ts — E07-S05 (research.md item 5). Duas camadas, nesta ordem:
// (1) substituição determinística de valores já conhecidos do cadastro do caso (mais confiável
// que reconhecimento de entidade genérico, porque já sabe exatamente o que procurar);
// (2) padrões estruturados por regex como rede de segurança para o que não está cadastrado.
// Roda SEMPRE antes de qualquer chamada a provedor externo (FR-003) — nunca pula etapa.

export interface ValorConhecido {
  rotulo: string; // ex.: "NOME_1", "PASSAPORTE"
  valor: string;
}

/** Camada 1 — substitui ocorrências exatas (case-insensitive) dos valores já cadastrados do
 *  caso. Ignora valores vazios/curtos demais (evita mascarar "a" ou similar por engano). */
function mascararValoresConhecidos(texto: string, conhecidos: ValorConhecido[]): string {
  let resultado = texto;
  for (const { rotulo, valor } of conhecidos) {
    const limpo = valor.trim();
    if (limpo.length < 3) continue;
    const escapado = limpo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    resultado = resultado.replace(new RegExp(escapado, "gi"), `[${rotulo}]`);
  }
  return resultado;
}

/** Camada 2 — padrões estruturados não necessariamente cadastrados. */
const PADROES_ESTRUTURADOS: { nome: string; regex: RegExp }[] = [
  // CPF: 000.000.000-00 ou 11 dígitos seguidos
  { nome: "CPF", regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g },
  // SSN: 000-00-0000
  { nome: "SSN", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  // Data no formato DD/MM/AAAA ou DD-MM-AAAA
  { nome: "DATA", regex: /\b\d{2}[/-]\d{2}[/-]\d{4}\b/g },
  // Número de documento genérico: 6+ dígitos seguidos (passaporte, RG, etc)
  { nome: "NUMERO_DOCUMENTO", regex: /\b[A-Z0-9]{6,12}\b/g },
];

function mascararPadroesEstruturados(texto: string): string {
  let resultado = texto;
  for (const { nome, regex } of PADROES_ESTRUTURADOS) {
    resultado = resultado.replace(regex, `[${nome}]`);
  }
  return resultado;
}

/** Aplica as duas camadas, nesta ordem fixa. Nunca devolve o texto original sem passar pelas
 *  duas — chamar isto é o único caminho aceito antes de enviar texto a provedor externo. */
export function mascararPii(texto: string, conhecidos: ValorConhecido[]): string {
  const semConhecidos = mascararValoresConhecidos(texto, conhecidos);
  return mascararPadroesEstruturados(semConhecidos);
}
