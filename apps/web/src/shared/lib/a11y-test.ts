import axe from "axe-core";

/**
 * Checagem de acessibilidade nos smoke tests de render (E00-S00 — gate do impeccable).
 *
 * A DoD exige contraste WCAG AA, label de formulário, ordem de heading e foco visível, e até
 * agora tudo isso era verificado a olho. `axe-core` cobre a parte estrutural por máquina.
 *
 * **Limite honesto:** `color-contrast` NÃO funciona em jsdom — a regra precisa de layout e de
 * pintura reais, que jsdom não faz, e devolve "incomplete" em vez de violação. Contraste continua
 * sendo peer review manual até existir uma passada com `@axe-core/playwright` no e2e, onde há
 * browser de verdade. Não finja que este helper cobre contraste.
 */
const IMPACTOS_BLOQUEANTES = new Set(["critical", "serious"]);

export async function violacoesGraves(container: HTMLElement) {
  const resultado = await axe.run(container, {
    resultTypes: ["violations"],
    rules: {
      // Sem layout real em jsdom: sempre "incomplete", nunca conclusivo. Ver nota acima.
      "color-contrast": { enabled: false },
      // A tela sob teste é um fragmento montado pelo Testing Library, não um documento completo:
      // <html lang>, landmark único e região de página são responsabilidade do shell, não dela.
      "html-has-lang": { enabled: false },
      region: { enabled: false },
      "landmark-one-main": { enabled: false },
      "page-has-heading-one": { enabled: false },
    },
  });
  return resultado.violations.filter((v) => IMPACTOS_BLOQUEANTES.has(v.impact ?? ""));
}

/** Falha o teste listando regra, impacto e o seletor exato de cada nó — para dar pra corrigir. */
export async function esperarSemViolacoesGraves(container: HTMLElement) {
  const violacoes = await violacoesGraves(container);
  if (violacoes.length === 0) return;
  const detalhe = violacoes
    .map((v) => {
      const alvos = v.nodes
        .slice(0, 3)
        .map((n) => `      ${n.target.join(" ")}`)
        .join("\n");
      return `  • [${v.impact}] ${v.id} — ${v.help}\n${alvos}`;
    })
    .join("\n");
  throw new Error(`${violacoes.length} violação(ões) de acessibilidade grave(s):\n${detalhe}`);
}
