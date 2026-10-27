import { expect, it } from "vitest";
import { requisitosDaFase } from "./requisitosDaFase";

it("oferece somente requisitos ativos da fase correspondente do programa congelado", () => {
  const programa = {
    fasesTemplate: [
      { id: "fase-a", ordem: 0 },
      { id: "fase-b", ordem: 1 },
    ],
    documentosExigidos: [
      { id: "1", faseTemplateId: "fase-a", ativo: true },
      { id: "2", faseTemplateId: "fase-b" },
      { id: "3", faseTemplateId: "fase-a", ativo: false },
    ],
  };
  expect(requisitosDaFase(programa, { ordem: 0 }).map((r) => r.id)).toEqual(["1"]);
  expect(requisitosDaFase(programa, { ordem: 99 })).toEqual([]);
});
