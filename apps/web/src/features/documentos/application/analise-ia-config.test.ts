// E06-S05 AC-4/AC-5 — a invariante do ADR-0005 (Documento.status nunca muda sozinho) tem que
// sobreviver à configuração nova: com skill ligada o parecer MUDA DE CONTEÚDO, o status NÃO.
// Sem analiseIA, comportamento idêntico ao E07-S01 (regressão). Escrito antes da implementação,
// mesma disciplina do E07-S01 AC-3.
import { container } from "@/app/di";
import { MockRequisitoDocumentoRepository } from "@/features/programas/infrastructure/MockRequisitoDocumentoRepository";
import { useMockDb } from "@/mocks/store";
import { beforeEach, describe, expect, it } from "vitest";
import { enviarEAnalisarDocumento } from "./hooks";

const requisitos = () => new MockRequisitoDocumentoRepository();

describe("E06-S05 — análise reflete skill; decisão continua humana (AC-4, AC-5)", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  it("AC-5: requisito sem IA habilitada analisa igual ao E07-S01 (regressão)", async () => {
    const documento = useMockDb
      .getState()
      .documentos.find((d) => d.id === "doc-renata-carta-experiencia");
    expect(documento?.requisitoId).toBeTruthy();
    const requisito = useMockDb
      .getState()
      .programas.flatMap((p) => p.documentosExigidos)
      .find((r) => r.id === documento?.requisitoId);
    expect(requisito?.analiseIA?.habilitada ?? false).toBe(false);
    if (!documento || !requisito)
      throw new Error("Fixture doc-renata-carta-experiencia incompleta");

    const direta = await container.analiseDocumento.analisar({
      documentoId: documento.id,
      tipoEsperado: requisito.tipo as never,
      objetivoRequisito: requisito.objetivo,
    });
    const peloCaminho = await enviarEAnalisarDocumento(documento, "url-mock://ac5");

    expect(peloCaminho.aderencia).toBe(direta.aderencia);
    expect(peloCaminho.lacunas).toEqual(direta.lacunas);
    expect(peloCaminho.sugestoes.join(" ")).not.toMatch(/skill/i);
    const depois = useMockDb
      .getState()
      .documentos.find((d) => d.id === "doc-renata-carta-experiencia");
    expect(depois?.status).toBe("em_analise");
  }, 10000);

  it("AC-4: parecer cita a skill configurada; Documento.status não muda sozinho", async () => {
    const documento = useMockDb
      .getState()
      .documentos.find((d) => d.id === "doc-renata-carta-experiencia");
    if (!documento) throw new Error("Fixture doc-renata-carta-experiencia incompleta");
    const repo = requisitos();
    const programaId = useMockDb
      .getState()
      .programas.find((p) => p.documentosExigidos.some((r) => r.id === documento.requisitoId))?.id;
    if (!programaId) throw new Error("Programa da fixture não encontrado");
    const todos = await repo.listarPorPrograma(programaId);
    const requisito = todos.find((r) => r.id === documento.requisitoId);
    if (!requisito) throw new Error("Requisito da fixture não encontrado");
    await repo.atualizar(requisito.id, {
      analiseIA: {
        habilitada: true,
        skill: "Verifique timbrado, assinatura e período de vínculo",
        arquivoReferenciaNome: "modelo-carta.pdf",
        arquivoReferenciaId: "arquivo-ref-1",
      },
    });

    const analise = await enviarEAnalisarDocumento(documento, "url-mock://ac4");
    expect(analise.sugestoes.join(" ")).toMatch(/Verifique timbrado, assinatura e período/);
    expect(analise.sugestoes.join(" ")).toMatch(/referência/i);

    const depois = useMockDb
      .getState()
      .documentos.find((d) => d.id === "doc-renata-carta-experiencia");
    expect(depois?.status).toBe("em_analise");
    expect(depois?.analise?.aderencia).toBe(analise.aderencia);
  }, 10000);
});
