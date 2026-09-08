import type { RequisitoDocumento } from "../domain/types";

/**
 * E06-S05 AC-3 — a regra "skill obrigatória quando habilitada" vive na camada de aplicação, não
 * só no formulário: o adapter também recusa gravar requisito inválido, então a invariante não
 * depende de a UI lembrar de checar.
 */
export function validarRequisitoDocumento(requisito: RequisitoDocumento): string | null {
  if (requisito.analiseIA?.habilitada && !requisito.analiseIA.skill.trim()) {
    return `Requisito "${requisito.titulo}" tem análise por IA ligada sem instrução (skill). Preencha a instrução ou desligue a análise.`;
  }
  return null;
}
