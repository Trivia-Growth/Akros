import { getSupabase } from "@/shared/supabase/client";
import type {
  CarteiraConsulta,
  CursorCarteira,
  FiltrosCarteira,
  ItemCarteira,
  TotaisCarteira,
} from "../application/ports";

const LIMITE_PAGINA = 50;

interface LinhaCarteira {
  cliente_id: string;
  cliente_nome: string;
  programa_id: string | null;
  fase_atual_titulo: string | null;
  responsavel: "cliente" | "akros" | null;
  documentos_faltantes: number;
  documentos_em_revisao: number;
  documentos_em_ajustes: number;
  pagamentos_vencidos: number;
  pagamentos_em_conferencia: number;
  situacao_financeira: "em_dia" | "atrasado";
  levantamento_estado: "incompleto" | "conferido";
  prazo_mais_proximo: string | null;
  atualizado_em: string;
  total_por_criterio: TotaisCarteira;
}

function paraItem(linha: LinhaCarteira): ItemCarteira {
  return {
    clienteId: linha.cliente_id,
    clienteNome: linha.cliente_nome,
    ...(linha.programa_id ? { programaId: linha.programa_id } : {}),
    ...(linha.fase_atual_titulo ? { faseAtualTitulo: linha.fase_atual_titulo } : {}),
    ...(linha.responsavel ? { responsavel: linha.responsavel } : {}),
    documentosFaltantes: linha.documentos_faltantes,
    documentosEmRevisao: linha.documentos_em_revisao,
    documentosEmAjustes: linha.documentos_em_ajustes,
    pagamentosVencidos: linha.pagamentos_vencidos,
    pagamentosEmConferencia: linha.pagamentos_em_conferencia,
    situacaoFinanceira: linha.situacao_financeira,
    levantamentoEstado: linha.levantamento_estado,
    ...(linha.prazo_mais_proximo ? { prazoMaisProximo: linha.prazo_mais_proximo } : {}),
    atualizadoEm: linha.atualizado_em,
  };
}

const TOTAIS_VAZIOS: TotaisCarteira = {
  total: 0,
  aguardandoCliente: 0,
  aguardandoAkros: 0,
  financeiroAtrasado: 0,
  cadastroIncompleto: 0,
};

/** Leitura paginada da carteira inteira (`crm.carteira_casos`), sem baixar a base inteira no
 *  navegador — página de até 50 casos por vez, cursor opaco devolvido/recebido de volta. */
export class SupabaseCarteiraConsulta implements CarteiraConsulta {
  async buscar(filtros: FiltrosCarteira, cursor?: CursorCarteira | null) {
    const { data, error } = await getSupabase()
      .schema("crm")
      .rpc("carteira_casos", {
        p_busca: filtros.busca || null,
        p_programa: filtros.programa || null,
        p_fase: filtros.fase || null,
        p_responsavel: filtros.responsavel || null,
        p_tipo_pendencia: filtros.tipoPendencia || null,
        p_prazo_ate: filtros.prazoAte || null,
        p_cursor_atualizado_em: cursor?.atualizadoEm ?? null,
        p_cursor_id: cursor?.clienteId ?? null,
        p_limite: LIMITE_PAGINA,
      });
    if (error) throw error;

    const linhas = (data ?? []) as LinhaCarteira[];
    const itens = linhas.map(paraItem);
    const ultima = linhas.at(-1);
    return {
      itens,
      proximoCursor:
        linhas.length === LIMITE_PAGINA && ultima
          ? { atualizadoEm: ultima.atualizado_em, clienteId: ultima.cliente_id }
          : null,
      totais: linhas[0]?.total_por_criterio ?? TOTAIS_VAZIOS,
    };
  }
}
