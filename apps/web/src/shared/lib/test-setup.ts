// Matchers de DOM para os testes (`toBeInTheDocument`, `toHaveTextContent`, …).
// @testing-library/jest-dom já era devDependency desde E00-S01, mas nunca tinha sido registrado —
// por isso os testes antigos usam asserções cruas. Registrado em E15-S01; não muda o
// comportamento de nenhum teste existente, só adiciona matchers.
import "@testing-library/jest-dom/vitest";
