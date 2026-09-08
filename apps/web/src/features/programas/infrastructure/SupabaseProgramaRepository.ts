import { getSupabase } from "@/shared/supabase/client";
import type { ProgramaRepository } from "../application/ports";
import type {
  CategoriaPrograma,
  EmissorDocumento,
  EtapaTemplate,
  FaseTemplate,
  Programa,
  RequisitoDocumento,
  ResponsavelEtapa,
  SujeitoPrograma,
} from "../domain/types";

type JsonObjeto = Record<string, unknown>;

export interface LinhaProgramaSupabase {
  id: string;
  codigo: string;
  nome: string;
  categoria: CategoriaPrograma;
  sujeito: SujeitoPrograma;
  versao: string;
  ativo: boolean;
  fases_template: unknown;
  documentos_exigidos: unknown;
}

const RESPONSAVEIS: ResponsavelEtapa[] = ["cliente", "akros", "terceiro", "uscis"];
const EMISSORES: EmissorDocumento[] = [
  "cliente",
  "empregador",
  "instituicao",
  "terceiro_certificado",
];

function ehObjeto(valor: unknown): valor is JsonObjeto {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function texto(valor: unknown, padrao: string): string {
  return typeof valor === "string" && valor.trim() ? valor : padrao;
}

function textoOpcional(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim() ? valor : undefined;
}

function listaDeTextos(valor: unknown): string[] | undefined {
  return Array.isArray(valor) && valor.every((item) => typeof item === "string")
    ? valor
    : undefined;
}

function paraEtapa(valor: unknown, idFase: string, indice: number): EtapaTemplate {
  if (!ehObjeto(valor)) {
    throw new Error("Programa remoto tem etapa inválida.");
  }
  const titulo = textoOpcional(valor.titulo);
  if (!titulo) throw new Error("Programa remoto tem etapa inválida.");
  const responsavel = RESPONSAVEIS.includes(valor.responsavel as ResponsavelEtapa)
    ? (valor.responsavel as ResponsavelEtapa)
    : "cliente";
  const prazoMedioDiasUteis =
    typeof valor.prazoMedioDiasUteis === "number" ? valor.prazoMedioDiasUteis : undefined;

  return {
    id: texto(valor.id, `${idFase}-etapa-${indice + 1}`),
    titulo,
    descricao: texto(valor.descricao, ""),
    responsavel,
    ...(textoOpcional(valor.responsavelDetalhe)
      ? { responsavelDetalhe: textoOpcional(valor.responsavelDetalhe) }
      : {}),
    ...(prazoMedioDiasUteis === undefined ? {} : { prazoMedioDiasUteis }),
    ...(listaDeTextos(valor.documentosRequeridos)
      ? { documentosRequeridos: listaDeTextos(valor.documentosRequeridos) }
      : {}),
  };
}

function paraFase(valor: unknown, programaId: string, indice: number): FaseTemplate {
  if (!ehObjeto(valor)) {
    throw new Error("Programa remoto tem fase inválida.");
  }
  const titulo = textoOpcional(valor.titulo);
  if (!titulo) throw new Error("Programa remoto tem fase inválida.");
  if (valor.etapas !== undefined && !Array.isArray(valor.etapas)) {
    throw new Error("Programa remoto tem etapas inválidas.");
  }
  const id = texto(valor.id, `${programaId}-fase-${indice + 1}`);

  return {
    id,
    ordem: typeof valor.ordem === "number" ? valor.ordem : indice,
    titulo,
    descricao: texto(valor.descricao, ""),
    etapas: (valor.etapas ?? []).map((etapa, indiceEtapa) => paraEtapa(etapa, id, indiceEtapa)),
  };
}

function paraRequisito(
  valor: unknown,
  programaId: string,
  fasePadraoId: string | undefined,
  indice: number,
): RequisitoDocumento {
  if (!ehObjeto(valor)) {
    throw new Error("Programa remoto tem documento exigido inválido.");
  }
  const titulo = textoOpcional(valor.titulo);
  if (!titulo) throw new Error("Programa remoto tem documento exigido inválido.");
  const emitidoPor = EMISSORES.includes(valor.emitidoPor as EmissorDocumento)
    ? (valor.emitidoPor as EmissorDocumento)
    : "cliente";
  const analiseIA = ehObjeto(valor.analiseIA)
    ? {
        habilitada: valor.analiseIA.habilitada === true,
        skill: texto(valor.analiseIA.skill, ""),
        ...(textoOpcional(valor.analiseIA.arquivoReferenciaNome)
          ? { arquivoReferenciaNome: textoOpcional(valor.analiseIA.arquivoReferenciaNome) }
          : {}),
      }
    : undefined;

  return {
    id: texto(valor.id, `${programaId}-documento-${indice + 1}`),
    faseTemplateId: texto(valor.faseTemplateId, fasePadraoId ?? ""),
    tipo: texto(valor.tipo, "outro"),
    titulo,
    objetivo: texto(valor.objetivo, titulo),
    obrigatorio: valor.obrigatorio === true,
    emitidoPor,
    ...(listaDeTextos(valor.aceitaSubstituto)
      ? { aceitaSubstituto: listaDeTextos(valor.aceitaSubstituto) }
      : {}),
    ...(analiseIA ? { analiseIA } : {}),
  };
}

export function paraDominio(linha: LinhaProgramaSupabase): Programa {
  if (!Array.isArray(linha.fases_template) || !Array.isArray(linha.documentos_exigidos)) {
    throw new Error("Programa remoto tem template inválido.");
  }
  const fasesTemplate = linha.fases_template.map((fase, indice) =>
    paraFase(fase, linha.id, indice),
  );
  return {
    id: linha.id,
    codigo: linha.codigo,
    nome: linha.nome,
    categoria: linha.categoria,
    sujeito: linha.sujeito,
    versao: linha.versao,
    ativo: linha.ativo,
    fasesTemplate,
    documentosExigidos: linha.documentos_exigidos.map((requisito, indice) =>
      paraRequisito(requisito, linha.id, fasesTemplate[0]?.id, indice),
    ),
  };
}

export function paraColunas(programa: Programa) {
  return {
    codigo: programa.codigo,
    nome: programa.nome,
    categoria: programa.categoria,
    sujeito: programa.sujeito,
    versao: programa.versao,
    ativo: programa.ativo,
    fases_template: programa.fasesTemplate,
    documentos_exigidos: programa.documentosExigidos,
  };
}

export class SupabaseProgramaRepository implements ProgramaRepository {
  async listar(apenasAtivos = false): Promise<Programa[]> {
    let query = getSupabase().schema("programas").from("programas").select();
    if (apenasAtivos) query = query.eq("ativo", true);
    const { data, error } = await query.order("codigo").order("versao");
    if (error) throw error;
    return (data as LinhaProgramaSupabase[]).map(paraDominio);
  }

  async obterPorCodigo(codigo: string): Promise<Programa | null> {
    const { data, error } = await getSupabase()
      .schema("programas")
      .from("programas")
      .select()
      .eq("codigo", codigo)
      .maybeSingle();
    if (error) throw error;
    return data ? paraDominio(data as LinhaProgramaSupabase) : null;
  }

  async salvar(programa: Programa): Promise<void> {
    const { error } = await getSupabase()
      .schema("programas")
      .from("programas")
      .update(paraColunas(programa))
      .eq("id", programa.id);
    if (error) throw error;
  }

  async duplicar(programaId: string): Promise<Programa | null> {
    const { data: origem, error: erroOrigem } = await getSupabase()
      .schema("programas")
      .from("programas")
      .select()
      .eq("id", programaId)
      .maybeSingle();
    if (erroOrigem) throw erroOrigem;
    if (!origem) return null;

    const programa = paraDominio(origem as LinhaProgramaSupabase);
    const sufixo = crypto.randomUUID().slice(0, 4);
    const { data, error } = await getSupabase()
      .schema("programas")
      .from("programas")
      .insert({
        ...paraColunas(programa),
        codigo: `${programa.codigo}-${sufixo}`,
        nome: `${programa.nome} — cópia`,
        versao: "0.1",
        ativo: false,
      })
      .select()
      .single();
    if (error) throw error;
    return paraDominio(data as LinhaProgramaSupabase);
  }
}
