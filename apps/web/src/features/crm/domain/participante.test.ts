import { describe, expect, it } from "vitest";
import type { PapelParticipante, Participante } from "./participante";
import {
  papelConcedeAutoridadeDeEquipe,
  papelPermitidoNoPrograma,
  participanteAtivo,
  revogarParticipante,
} from "./participante";

const TODOS_OS_PAPEIS: PapelParticipante[] = [
  "aplicante",
  "beneficiario",
  "organizacao_aplicante",
  "familiar_apoio",
];

function participante(parciais: Partial<Participante> = {}): Participante {
  return {
    id: "participante-1",
    clienteId: "cliente-1",
    papel: "aplicante",
    sujeitoTipo: "titular",
    nomeExibicao: "Fulano de Tal",
    estado: "ativo",
    ...parciais,
  };
}

describe("participante — papelPermitidoNoPrograma", () => {
  it("papel presente na lista do programa é permitido", () => {
    expect(papelPermitidoNoPrograma("aplicante", ["aplicante", "familiar_apoio"])).toBe(true);
  });

  it("papel ausente da lista do programa é recusado", () => {
    expect(papelPermitidoNoPrograma("organizacao_aplicante", ["aplicante", "familiar_apoio"])).toBe(
      false,
    );
  });

  it("lista vazia recusa qualquer papel (programa não declarou nenhum)", () => {
    for (const papel of TODOS_OS_PAPEIS) {
      expect(papelPermitidoNoPrograma(papel, [])).toBe(false);
    }
  });
});

describe("participante — papelConcedeAutoridadeDeEquipe (ADR-0018: nenhum papel autoriza ação de equipe)", () => {
  it.each(TODOS_OS_PAPEIS)("'%s' nunca concede autoridade de equipe", (papel) => {
    expect(papelConcedeAutoridadeDeEquipe(papel)).toBe(false);
  });
});

describe("participante — participanteAtivo", () => {
  it("estado 'ativo' é ativo", () => {
    expect(participanteAtivo(participante({ estado: "ativo" }))).toBe(true);
  });

  it("estado 'revogado' não é ativo", () => {
    expect(participanteAtivo(participante({ estado: "revogado" }))).toBe(false);
  });

  it("participante sem authUserId (sem acesso ao portal) ainda é uma entidade válida — ADR-0018", () => {
    const semAcesso = participante({ authUserId: undefined, estado: "ativo" });
    expect(participanteAtivo(semAcesso)).toBe(true);
  });
});

describe("participante — revogarParticipante", () => {
  it("devolve cópia com estado 'revogado' e os campos de revogação preenchidos", () => {
    const original = participante({ estado: "ativo" });
    const revogado = revogarParticipante(original, "admin-1", "2026-02-01T00:00:00.000Z");

    expect(revogado.estado).toBe("revogado");
    expect(revogado.revogadoPor).toBe("admin-1");
    expect(revogado.revogadoEm).toBe("2026-02-01T00:00:00.000Z");
  });

  it("não muta o objeto original (prova de pureza)", () => {
    const original = participante({ estado: "ativo" });
    const copiaDoOriginalAntes = { ...original };

    const resultado = revogarParticipante(original, "admin-1", "2026-02-01T00:00:00.000Z");

    expect(original).toEqual(copiaDoOriginalAntes);
    expect(resultado).not.toBe(original);
  });

  it("preserva papel, clienteId e authUserId — histórico não muda, só o acesso", () => {
    const original = participante({
      papel: "beneficiario",
      clienteId: "cliente-42",
      authUserId: "auth-user-9",
    });

    const revogado = revogarParticipante(original, "admin-1", "2026-02-01T00:00:00.000Z");

    expect(revogado.papel).toBe("beneficiario");
    expect(revogado.clienteId).toBe("cliente-42");
    expect(revogado.authUserId).toBe("auth-user-9");
  });

  it("revogar um participante de uma lista não afeta os demais (FR da US6) — pureza em ação sobre lista", () => {
    const lista: Participante[] = [
      participante({ id: "p1", papel: "aplicante", estado: "ativo" }),
      participante({ id: "p2", papel: "beneficiario", estado: "ativo" }),
      participante({ id: "p3", papel: "familiar_apoio", estado: "ativo" }),
    ];

    const listaAtualizada = lista.map((p) =>
      p.id === "p2" ? revogarParticipante(p, "admin-1", "2026-02-01T00:00:00.000Z") : p,
    );

    const p1 = listaAtualizada.find((p) => p.id === "p1") as Participante;
    const p3 = listaAtualizada.find((p) => p.id === "p3") as Participante;
    const p2 = listaAtualizada.find((p) => p.id === "p2") as Participante;

    // Prova: só o item revogado muda — os demais continuam os mesmos objetos, intactos.
    expect(p1).toBe(lista[0]);
    expect(p3).toBe(lista[2]);
    expect(p1.estado).toBe("ativo");
    expect(p3.estado).toBe("ativo");
    expect(p2.estado).toBe("revogado");
  });
});
