// E06-S05/ADR-0013 — adapter real do repositório de requisitos. O `programas` real já permite
// UPDATE admin (0015, E13-S04): a escrita é read-modify-write do JSONB `documentos_exigidos`
// via ProgramaRepository — sem RPC nova. A checagem de vínculo lê `documentos.documentos`
// (RLS admin já cobre SELECT; é leitura de tabela, não import do feature documentos).
import { getSupabase } from "@/shared/supabase/client";
import { RemocaoRequisitoBloqueada, type RequisitoDocumentoRepository } from "../application/ports";
import { validarRequisitoDocumento } from "../application/validacao";
import type { ArquivoReferencia, Programa, RequisitoDocumento } from "../domain/types";
import { SupabaseProgramaRepository } from "./SupabaseProgramaRepository";

function novoId(prefixo: string): string {
  return `${prefixo}-${crypto.randomUUID().slice(0, 8)}`;
}

export class SupabaseRequisitoDocumentoRepository implements RequisitoDocumentoRepository {
  private readonly programas = new SupabaseProgramaRepository();

  private async programaDoRequisito(requisitoId: string) {
    const programas = await this.programas.listar();
    const programa = programas.find((p) => p.documentosExigidos.some((r) => r.id === requisitoId));
    if (!programa) throw new Error(`Requisito ${requisitoId} não encontrado`);
    return programa;
  }

  private requisitoDoPrograma(programa: Programa, requisitoId: string): RequisitoDocumento {
    const requisito = programa.documentosExigidos.find((r) => r.id === requisitoId);
    if (!requisito) throw new Error(`Requisito ${requisitoId} não encontrado`);
    return requisito;
  }

  async listarPorPrograma(programaId: string): Promise<RequisitoDocumento[]> {
    const programa = (await this.programas.listar()).find((p) => p.id === programaId);
    return programa?.documentosExigidos ?? [];
  }

  async criar(input: Omit<RequisitoDocumento, "id">): Promise<RequisitoDocumento> {
    const requisito: RequisitoDocumento = { ...input, id: novoId("req") };
    const invalido = validarRequisitoDocumento(requisito);
    if (invalido) throw new Error(invalido);
    const programas = await this.programas.listar();
    const programa = programas.find((p) =>
      p.fasesTemplate.some((f) => f.id === input.faseTemplateId),
    );
    if (!programa) throw new Error(`Nenhum programa contém a fase ${input.faseTemplateId}`);
    await this.programas.salvar({
      ...programa,
      documentosExigidos: [...programa.documentosExigidos, requisito],
    });
    return requisito;
  }

  async atualizar(id: string, input: Partial<RequisitoDocumento>): Promise<RequisitoDocumento> {
    const programa = await this.programaDoRequisito(id);
    const anterior = this.requisitoDoPrograma(programa, id);
    const atualizado: RequisitoDocumento = { ...anterior, ...input, id };
    const invalido = validarRequisitoDocumento(atualizado);
    if (invalido) throw new Error(invalido);
    await this.programas.salvar({
      ...programa,
      documentosExigidos: programa.documentosExigidos.map((r) => (r.id === id ? atualizado : r)),
    });
    return atualizado;
  }

  async contarDocumentosVinculados(requisitoId: string): Promise<number> {
    const { count, error } = await getSupabase()
      .schema("documentos")
      .from("documentos")
      .select("id", { count: "exact", head: true })
      .eq("requisito_id", requisitoId)
      .is("deleted_at", null);
    if (error) throw error;
    return count ?? 0;
  }

  async remover(id: string): Promise<void> {
    const vinculados = await this.contarDocumentosVinculados(id);
    if (vinculados > 0) throw new RemocaoRequisitoBloqueada(id, vinculados);
    const programa = await this.programaDoRequisito(id);
    await this.programas.salvar({
      ...programa,
      documentosExigidos: programa.documentosExigidos.filter((r) => r.id !== id),
    });
  }

  async salvarArquivoReferencia(
    requisitoId: string,
    arquivo: File,
    enviadoPor: string,
  ): Promise<ArquivoReferencia> {
    const programa = await this.programaDoRequisito(requisitoId);
    const requisito = this.requisitoDoPrograma(programa, requisitoId);
    const referencia: ArquivoReferencia = {
      id: novoId("arquivo-ref"),
      requisitoId,
      nomeArquivo: arquivo.name,
      tamanhoBytes: arquivo.size,
      enviadoEm: new Date().toISOString(),
      enviadoPor,
    };
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
    await this.atualizar(requisitoId, {
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
    });
    return referencia;
  }
}
