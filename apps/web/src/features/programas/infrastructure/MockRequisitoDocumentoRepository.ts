// E06-S05/ADR-0013 — adapter demo do repositório de requisitos. Read-modify-write no
// `programas` do useMockDb (mesmo padrão de MockProgramaRepository); remoção com Documento de
// cliente vinculado é recusada com `RemocaoRequisitoBloqueada` (AC-2), nunca cascade.
import { comLatencia, useMockDb } from "@/mocks/store";
import { RemocaoRequisitoBloqueada, type RequisitoDocumentoRepository } from "../application/ports";
import { validarRequisitoDocumento } from "../application/validacao";
import type { ArquivoReferencia, Programa, RequisitoDocumento } from "../domain/types";

function novoId(prefixo: string): string {
  return `${prefixo}-${crypto.randomUUID().slice(0, 8)}`;
}

function programaDaFase(faseTemplateId: string): Programa {
  const programa = useMockDb
    .getState()
    .programas.find((p) => p.fasesTemplate.some((f) => f.id === faseTemplateId));
  if (!programa) throw new Error(`Nenhum programa contém a fase ${faseTemplateId}`);
  return programa;
}

function programaDoRequisito(requisitoId: string): Programa {
  const programa = useMockDb
    .getState()
    .programas.find((p) => p.documentosExigidos.some((r) => r.id === requisitoId));
  if (!programa) throw new Error(`Requisito ${requisitoId} não encontrado`);
  return programa;
}

function requisitoDoPrograma(programa: Programa, requisitoId: string): RequisitoDocumento {
  const requisito = programa.documentosExigidos.find((r) => r.id === requisitoId);
  if (!requisito) throw new Error(`Requisito ${requisitoId} não encontrado`);
  return requisito;
}

function gravar(programa: Programa): void {
  useMockDb.getState().salvarPrograma(programa);
}

export class MockRequisitoDocumentoRepository implements RequisitoDocumentoRepository {
  async listarPorPrograma(programaId: string): Promise<RequisitoDocumento[]> {
    const programa = useMockDb.getState().programas.find((p) => p.id === programaId);
    return comLatencia(programa?.documentosExigidos ?? []);
  }

  async criar(input: Omit<RequisitoDocumento, "id">): Promise<RequisitoDocumento> {
    const requisito: RequisitoDocumento = { ...input, id: novoId("req") };
    const invalido = validarRequisitoDocumento(requisito);
    if (invalido) throw new Error(invalido);
    const programa = programaDaFase(input.faseTemplateId);
    gravar({ ...programa, documentosExigidos: [...programa.documentosExigidos, requisito] });
    return comLatencia(requisito);
  }

  async atualizar(id: string, input: Partial<RequisitoDocumento>): Promise<RequisitoDocumento> {
    const programa = programaDoRequisito(id);
    const anterior = requisitoDoPrograma(programa, id);
    const atualizado: RequisitoDocumento = { ...anterior, ...input, id };
    const invalido = validarRequisitoDocumento(atualizado);
    if (invalido) throw new Error(invalido);
    gravar({
      ...programa,
      documentosExigidos: programa.documentosExigidos.map((r) => (r.id === id ? atualizado : r)),
    });
    return comLatencia(atualizado);
  }

  async contarDocumentosVinculados(requisitoId: string): Promise<number> {
    const total = useMockDb
      .getState()
      .documentos.filter((d) => d.requisitoId === requisitoId).length;
    return comLatencia(total);
  }

  async remover(id: string): Promise<void> {
    const vinculados = await this.contarDocumentosVinculados(id);
    if (vinculados > 0) throw new RemocaoRequisitoBloqueada(id, vinculados);
    const programa = programaDoRequisito(id);
    gravar({
      ...programa,
      documentosExigidos: programa.documentosExigidos.filter((r) => r.id !== id),
    });
    return comLatencia(undefined);
  }

  async salvarArquivoReferencia(
    requisitoId: string,
    arquivo: File,
    enviadoPor: string,
  ): Promise<ArquivoReferencia> {
    const programa = programaDoRequisito(requisitoId);
    const requisito = requisitoDoPrograma(programa, requisitoId);
    const referencia: ArquivoReferencia = {
      id: novoId("arquivo-ref"),
      requisitoId,
      nomeArquivo: arquivo.name,
      tamanhoBytes: arquivo.size,
      enviadoEm: new Date().toISOString(),
      enviadoPor,
    };
    // Troca registrada no histórico (AC-6): o anterior entra no histórico em vez de sumir.
    // Registros legados (id sem metadados de troca) entram marcados como "(legado)".
    const historicoAnterior: ArquivoReferencia[] = requisito.analiseIA?.arquivoReferenciaId
      ? [
          {
            id: requisito.analiseIA.arquivoReferenciaId,
            requisitoId,
            nomeArquivo: requisito.analiseIA.arquivoReferenciaNome ?? "(sem nome registrado)",
            tamanhoBytes: 0,
            enviadoEm: "",
            enviadoPor: "(legado — anterior ao histórico)",
          },
        ]
      : [];
    const atualizado: RequisitoDocumento = {
      ...requisito,
      analiseIA: {
        habilitada: requisito.analiseIA?.habilitada ?? true,
        skill: requisito.analiseIA?.skill ?? "",
        arquivoReferenciaId: referencia.id,
        arquivoReferenciaNome: referencia.nomeArquivo,
      },
      historicoArquivosReferencia: [
        ...historicoAnterior,
        ...(requisito.historicoArquivosReferencia ?? []),
      ],
    };
    gravar({
      ...programa,
      documentosExigidos: programa.documentosExigidos.map((r) =>
        r.id === requisitoId ? atualizado : r,
      ),
    });
    return comLatencia(referencia);
  }
}
