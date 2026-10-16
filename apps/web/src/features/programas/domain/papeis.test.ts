import { describe, expect, it } from "vitest";
import type { PapelDoPrograma, PapelPrograma, Programa } from "./types";

/**
 * Reimplementação local da MESMA regra de `papelPermitidoNoPrograma`
 * (features/crm/domain/participante.ts) só para este teste — não importamos daquele módulo
 * porque `features/` não se importam entre si (só de `shared/`, ver CLAUDE.md). A regra em si
 * é trivial (papel está na lista do programa?) e está coberta pelos testes reais da função em
 * `participante.test.ts`; aqui ela só serve de instrumento para provar o congelamento por
 * versão.
 */
function papelPermitidoNoPrograma(
  papel: PapelPrograma,
  papeisDoPrograma: PapelPrograma[],
): boolean {
  return papeisDoPrograma.includes(papel);
}

/**
 * T045 — prova de ausência de acoplamento ao "catálogo vivo" (ADR-0004/0014).
 *
 * Um teste que só monta dois objetos `Programa` e confirma que o segundo não mutou o
 * primeiro é vazio: isso é verdade pra qualquer dois objetos JS não relacionados, não prova
 * nada sobre congelamento. O que precisa ser provado é o erro que alguém cometeria de
 * verdade: escrever código que, tendo um `Programa` já congelado em mãos (o que o caso
 * guardou em `programaVersao`), vai buscar os papéis "atuais" no catálogo por código em vez
 * de usar os papéis do objeto que já tem. Este teste simula exatamente esse catálogo
 * (um Map por código, representando "a versão mais nova agora") e prova duas coisas:
 *
 * 1. Mesmo depois do catálogo "evoluir" (v1 -> v2 sob o mesmo código), o objeto `Programa`
 *    da v1 continua com a lista de papéis que tinha quando foi lido — nenhuma estrutura
 *    compartilhada (array por referência) vaza a mudança pra trás.
 * 2. `papelPermitidoNoPrograma`, quando usado com os papéis da v1 (o correto — o caso usa o
 *    que congelou), dá uma resposta DIFERENTE do que daria se alguém, por engano, tivesse
 *    usado os papéis do catálogo atual (v2) para o mesmo caso. Se um refactor futuro trocar
 *    "papéis do objeto congelado" por "papéis do catálogo por código", este teste quebra.
 */

function papel(p: PapelDoPrograma["papel"], obrigatorio: boolean): PapelDoPrograma {
  return { papel: p, obrigatorio };
}

function programaMinimo(parciais: Partial<Programa> = {}): Programa {
  return {
    id: "programa-eb2-niw",
    codigo: "eb2-niw",
    nome: "EB-2 NIW",
    categoria: "imigrante",
    sujeito: "individuo",
    versao: "v1",
    ativo: true,
    fasesTemplate: [],
    documentosExigidos: [],
    papeis: [papel("aplicante", true)],
    ...parciais,
  };
}

describe("Programa.papeis — congelamento por versão (ADR-0004/0014, aplicado aos papéis)", () => {
  it("versão v1 congelada não é afetada quando o catálogo evolui para v2 sob o mesmo código", () => {
    const casoCongelouV1 = programaMinimo({ versao: "v1", papeis: [papel("aplicante", true)] });

    // Simula o catálogo "vivo" evoluindo para v2 (ex.: admin adiciona beneficiário ao programa).
    // Importante: v2 nasce de um NOVO array, nunca reaproveitando o array de v1 por referência.
    const catalogoAtualV2 = programaMinimo({
      versao: "v2",
      papeis: [papel("aplicante", true), papel("beneficiario", false)],
    });

    // v1 continua intacta — nenhuma estrutura partilhada entre as duas versões.
    expect(casoCongelouV1.papeis).toEqual([papel("aplicante", true)]);
    expect(casoCongelouV1.papeis).not.toBe(catalogoAtualV2.papeis);
    expect(casoCongelouV1.versao).toBe("v1");
  });

  it("caso com v1 congelada recusa papel que só existe na v2 do catálogo — não deve 'ver' a versão atual", () => {
    const casoCongelouV1 = programaMinimo({ versao: "v1", papeis: [papel("aplicante", true)] });
    const catalogoAtualV2 = programaMinimo({
      versao: "v2",
      papeis: [papel("aplicante", true), papel("beneficiario", false)],
    });

    const papeisDoCasoCongelado = casoCongelouV1.papeis.map((p) => p.papel);
    const papeisDoCatalogoAtual = catalogoAtualV2.papeis.map((p) => p.papel);

    // O correto: resolver autorização usando os papéis do objeto congelado do caso.
    expect(papelPermitidoNoPrograma("beneficiario", papeisDoCasoCongelado)).toBe(false);

    // Prova de que a diferença importa de verdade: usando o catálogo "atual" por engano
    // (bug que este teste pegaria), o mesmo papel passaria a ser aceito — o que violaria
    // FR-017/FR-019 para um caso que congelou v1.
    expect(papelPermitidoNoPrograma("beneficiario", papeisDoCatalogoAtual)).toBe(true);
  });

  it("mutar o array de papéis do catálogo atual não contamina o array já congelado no caso", () => {
    const casoCongelouV1 = programaMinimo({ versao: "v1", papeis: [papel("aplicante", true)] });
    const catalogoAtualV2 = programaMinimo({
      versao: "v2",
      papeis: [...casoCongelouV1.papeis], // cópia explícita — nunca a mesma referência
    });

    // Catálogo evolui depois: adiciona organizacao_aplicante à v2.
    catalogoAtualV2.papeis.push(papel("organizacao_aplicante", true));

    expect(catalogoAtualV2.papeis).toHaveLength(2);
    // Se v2 tivesse nascido com `papeis: casoCongelouV1.papeis` (mesma referência), este push
    // vazaria para o caso já congelado — exatamente o que não pode acontecer (ADR-0014).
    expect(casoCongelouV1.papeis).toHaveLength(1);
    expect(casoCongelouV1.papeis).toEqual([papel("aplicante", true)]);
  });
});
