/**
 * Envelope de retry para `import()` dinâmico (E15-S01, AC-5).
 *
 * A causa mais comum de tela branca em SPA com code-splitting não é bug de render: é o usuário
 * com a aba aberta quando um deploy novo sobe. Os arquivos com hash antigo somem do CDN e o
 * próximo `import()` falha com "Failed to fetch dynamically imported module". Sem tratamento isso
 * é indistinguível de um bug, e o usuário só vê a tela sumir.
 *
 * Duas tentativas cobrem o caso de rede instável. Esgotadas, o erro sobe para o `ErrorBoundary`,
 * que reconhece falha de chunk e oferece **recarregar a página** — recarregar busca o
 * `index.html` novo e resolve o caso do deploy, enquanto "tentar de novo" não resolveria.
 */
export async function carregarComRetry<T>(
  importar: () => Promise<T>,
  tentativas = 2,
  esperaMs = 300,
): Promise<T> {
  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await importar();
    } catch (erro) {
      ultimoErro = erro;
      if (i < tentativas - 1) await new Promise((r) => setTimeout(r, esperaMs));
    }
  }
  throw ultimoErro;
}

/** Falha de carregamento de chunk pede recarregar a página; bug de render, não. */
export function ehFalhaDeChunk(erro: unknown): boolean {
  const msg = erro instanceof Error ? erro.message : String(erro ?? "");
  return /dynamically imported module|Loading chunk|Importing a module script failed|Failed to fetch/i.test(
    msg,
  );
}
