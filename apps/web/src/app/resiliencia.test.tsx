import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { admin, portal, rota, site } from "./rota";

/**
 * E15-S01 — resiliência de módulo.
 *
 * O modo de falha que estes testes fecham não é hipotético: os dois últimos bugs do projeto foram
 * crashes de render (seletor Zustand com `.filter()` inline estourando `useSyncExternalStore`,
 * E12-S01). Sem fronteira de falha, um `throw` numa tela do admin desmonta a árvore React inteira
 * — e leva junto o site institucional, que é o canal de captação de lead.
 */

function Explode(): never {
  throw new Error("boom de render");
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <nav>menu da frente</nav>
      {children}
    </MemoryRouter>
  );
}

/** Silencia o ruído esperado: React loga todo erro capturado por boundary. */
function semRuidoDeErro() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("E15-S01 — falha de módulo fica contida", () => {
  afterEach(cleanup);

  it("AC-1: exceção numa rota do admin não impede o site de renderizar", async () => {
    const spy = semRuidoDeErro();

    render(
      <MemoryRouter>
        <ErrorBoundary {...admin}>
          <Explode />
        </ErrorBoundary>
        <main data-testid="site">site institucional</main>
      </MemoryRouter>,
    );

    // O boundary capturou — a aplicação não foi desmontada.
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    // E a outra frente, montada na mesma árvore React, continua de pé.
    expect(screen.getByTestId("site")).toHaveTextContent("site institucional");

    spy.mockRestore();
  });

  it("AC-2: o shell de navegação sobrevive à queda do conteúdo", async () => {
    const spy = semRuidoDeErro();

    render(
      <Shell>
        <ErrorBoundary {...portal}>
          <Explode />
        </ErrorBoundary>
      </Shell>,
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("menu da frente")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("AC-3: o fallback nomeia a área, oferece tentar de novo e um caminho de volta", async () => {
    const spy = semRuidoDeErro();
    let deveExplodir = true;
    function Instavel() {
      if (deveExplodir) throw new Error("boom de render");
      return <p>conteúdo recuperado</p>;
    }

    render(
      <Shell>
        <ErrorBoundary {...admin}>
          <Instavel />
        </ErrorBoundary>
      </Shell>,
    );

    expect(await screen.findByText(/Algo quebrou em o painel admin/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: admin.rotuloVoltar })).toBeInTheDocument();

    // "Tentar de novo" remonta a subárvore — sem recarregar a página.
    deveExplodir = false;
    fireEvent.click(screen.getByRole("button", { name: /Tentar de novo/ }));
    expect(await screen.findByText("conteúdo recuperado")).toBeInTheDocument();

    spy.mockRestore();
  });

  it("AC-5: falha de carregamento de chunk oferece recarregar, não tentar de novo", async () => {
    const spy = semRuidoDeErro();
    function ChunkQuebrado(): never {
      throw new Error("Failed to fetch dynamically imported module");
    }

    render(
      <Shell>
        <ErrorBoundary {...site}>
          <ChunkQuebrado />
        </ErrorBoundary>
      </Shell>,
    );

    expect(await screen.findByRole("button", { name: /Recarregar a página/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tentar de novo/ })).not.toBeInTheDocument();

    spy.mockRestore();
  });

  it("AC-4: rota carregada por `rota()` mostra o esqueleto e depois a página", async () => {
    render(<Shell>{rota(site, async () => ({ default: () => <h1>página carregada</h1> }))}</Shell>);

    await waitFor(() => expect(screen.getByText("página carregada")).toBeInTheDocument());
  });

  it("AC-5: `rota()` sobrevive a um import que falha na primeira tentativa", async () => {
    let tentativas = 0;
    render(
      <Shell>
        {rota(site, async () => {
          tentativas++;
          if (tentativas === 1) throw new Error("Failed to fetch dynamically imported module");
          return { default: () => <h1>carregou na segunda</h1> };
        })}
      </Shell>,
    );

    await waitFor(() => expect(screen.getByText("carregou na segunda")).toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(tentativas).toBe(2);
  });
});
