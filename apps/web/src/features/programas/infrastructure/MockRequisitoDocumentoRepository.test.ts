// E06-S05/ADR-0013 — gates da camada de dados: validação de skill (AC-3), remoção bloqueada
// com oferta implícita de "desativar" (AC-2) e histórico de troca de referência (AC-6).
// Contratos em design.md; `Documento.status` nunca é tocado aqui (invariante ADR-0005).
import { useMockDb } from "@/mocks/store";
import { beforeEach, describe, expect, it } from "vitest";
import { RemocaoRequisitoBloqueada } from "../application/ports";
import { MockRequisitoDocumentoRepository } from "./MockRequisitoDocumentoRepository";

const requisitos = () => new MockRequisitoDocumentoRepository();

function requisitoNoStore(id: string) {
  return useMockDb
    .getState()
    .programas.flatMap((p) => p.documentosExigidos)
    .find((r) => r.id === id);
}

function exigirRequisito(id: string) {
  const requisito = requisitoNoStore(id);
  if (!requisito) throw new Error(`Fixture sem requisito ${id}`);
  return requisito;
}

describe("E06-S05 — MockRequisitoDocumentoRepository (AC-2, AC-3, AC-6)", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  it("AC-3: criar com análise IA ligada e skill vazia é recusado", async () => {
    const faseId = useMockDb.getState().programas[0].fasesTemplate[0].id;
    await expect(
      requisitos().criar({
        faseTemplateId: faseId,
        tipo: "outro",
        titulo: "Documento sem skill",
        objetivo: "objetivo",
        obrigatorio: true,
        emitidoPor: "cliente",
        analiseIA: { habilitada: true, skill: "   " },
      }),
    ).rejects.toThrow(/skill/i);
  });

  it("AC-3: atualizar para habilitado sem skill é recusado; com skill passa", async () => {
    const repo = requisitos();
    await expect(
      repo.atualizar("req-eb2-questionario", {
        analiseIA: { habilitada: true, skill: "" },
      }),
    ).rejects.toThrow(/skill/i);

    const atualizado = await repo.atualizar("req-eb2-questionario", {
      analiseIA: { habilitada: true, skill: "Confira validade e emissor" },
    });
    expect(atualizado.analiseIA?.skill).toBe("Confira validade e emissor");
    expect(requisitoNoStore("req-eb2-questionario")?.analiseIA?.habilitada).toBe(true);
  });

  it("AC-2: remoção com Documento de cliente vinculado lança RemocaoRequisitoBloqueada e preserva o requisito", async () => {
    const repo = requisitos();
    const vinculados = await repo.contarDocumentosVinculados("req-eb2-curriculo");
    expect(vinculados).toBeGreaterThan(0);

    const erro = await repo.remover("req-eb2-curriculo").catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(RemocaoRequisitoBloqueada);
    expect((erro as RemocaoRequisitoBloqueada).name).toBe("RemocaoRequisitoBloqueada");
    expect((erro as RemocaoRequisitoBloqueada).documentosVinculados).toBe(vinculados);
    expect(requisitoNoStore("req-eb2-curriculo")).toBeTruthy();
  });

  it("AC-2: remoção sem vínculos remove o requisito", async () => {
    const repo = requisitos();
    expect(await repo.contarDocumentosVinculados("req-eb2-questionario")).toBe(0);
    await repo.remover("req-eb2-questionario");
    expect(requisitoNoStore("req-eb2-questionario")).toBeUndefined();
  });

  it("AC-6: trocar arquivo de referência registra quem/quando e preserva o anterior no histórico", async () => {
    const repo = requisitos();
    await repo.atualizar("req-eb2-questionario", {
      analiseIA: {
        habilitada: true,
        skill: "Confira validade e emissor",
        arquivoReferenciaId: "arquivo-ref-legado",
        arquivoReferenciaNome: "modelo-legado.pdf",
      },
    });

    const novo = new File(["conteudo"], "modelo-novo.pdf", { type: "application/pdf" });
    const referencia = await repo.salvarArquivoReferencia(
      "req-eb2-questionario",
      novo,
      "ana@akros.com",
    );

    expect(referencia.nomeArquivo).toBe("modelo-novo.pdf");
    expect(referencia.enviadoPor).toBe("ana@akros.com");
    expect(referencia.enviadoEm).toBeTruthy();

    const depois = exigirRequisito("req-eb2-questionario");
    expect(depois.analiseIA?.arquivoReferenciaId).toBe(referencia.id);
    expect(depois.analiseIA?.arquivoReferenciaNome).toBe("modelo-novo.pdf");
    // O anterior não foi sobrescrito silenciosamente: migrou para o histórico.
    expect(depois.historicoArquivosReferencia).toHaveLength(1);
    expect(depois.historicoArquivosReferencia?.[0]).toMatchObject({
      id: "arquivo-ref-legado",
      nomeArquivo: "modelo-legado.pdf",
      enviadoPor: "(legado — anterior ao histórico)",
    });

    // Segunda troca acumula — histórico nunca encolhe.
    const terceiro = new File(["x"], "modelo-v3.pdf", { type: "application/pdf" });
    await repo.salvarArquivoReferencia("req-eb2-questionario", terceiro, "bruno@akros.com");
    const final = exigirRequisito("req-eb2-questionario");
    expect(final.historicoArquivosReferencia).toHaveLength(2);
    expect(final.analiseIA?.arquivoReferenciaNome).toBe("modelo-v3.pdf");
  });
});
