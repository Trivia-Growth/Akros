import { getSupabase } from "@/shared/supabase/client";
import type { PagamentosConsulta } from "../application/ports";
import type { DadosRecebimento, Pagamento } from "../domain/types";

interface LinhaPagamento {
  id: string;
  cliente_id: string;
  descricao: string;
  valor: number | string;
  moeda: Pagamento["moeda"];
  status: Pagamento["status"];
  vencimento: string;
  tipo: Pagamento["tipo"];
  pago_em: string | null;
  comprovante_url: string | null;
  anexado_em: string | null;
  valor_recebido: number | string | null;
  confirmado_por: string | null;
}

interface LinhaDadosRecebimento {
  moeda: DadosRecebimento["moeda"];
  titular: string;
  banco: string;
  agencia: string | null;
  conta: string | null;
  chave_pix: string | null;
  routing_number: string | null;
  account_number: string | null;
  swift: string | null;
  instrucoes: string;
}

export function paraPagamento(linha: LinhaPagamento): Pagamento {
  return {
    id: linha.id,
    clienteId: linha.cliente_id,
    descricao: linha.descricao,
    valor: Number(linha.valor),
    moeda: linha.moeda,
    status: linha.status,
    vencimento: linha.vencimento,
    tipo: linha.tipo,
    ...(linha.pago_em ? { pagoEm: linha.pago_em } : {}),
    ...(linha.comprovante_url ? { comprovanteUrl: linha.comprovante_url } : {}),
    ...(linha.anexado_em ? { anexadoEm: linha.anexado_em } : {}),
    ...(linha.valor_recebido === null ? {} : { valorRecebido: Number(linha.valor_recebido) }),
    ...(linha.confirmado_por ? { confirmadoPor: linha.confirmado_por } : {}),
  };
}

export function paraDadosRecebimento(linha: LinhaDadosRecebimento): DadosRecebimento {
  return {
    moeda: linha.moeda,
    titular: linha.titular,
    banco: linha.banco,
    instrucoes: linha.instrucoes,
    ...(linha.agencia ? { agencia: linha.agencia } : {}),
    ...(linha.conta ? { conta: linha.conta } : {}),
    ...(linha.chave_pix ? { chavePix: linha.chave_pix } : {}),
    ...(linha.routing_number ? { routingNumber: linha.routing_number } : {}),
    ...(linha.account_number ? { accountNumber: linha.account_number } : {}),
    ...(linha.swift ? { swift: linha.swift } : {}),
  };
}

/** Leitura dos pagamentos do cliente por RLS, sem conversão de UUID para fixture. */
export class SupabasePagamentosConsulta implements PagamentosConsulta {
  async carregarCliente() {
    const [pagamentosResposta, dadosResposta] = await Promise.all([
      getSupabase().schema("pagamentos").from("pagamentos").select().order("vencimento"),
      getSupabase().schema("pagamentos").from("dados_recebimento").select().order("moeda"),
    ]);
    if (pagamentosResposta.error) throw pagamentosResposta.error;
    if (dadosResposta.error) throw dadosResposta.error;
    return {
      pagamentos: (pagamentosResposta.data as LinhaPagamento[]).map(paraPagamento),
      dadosRecebimento: (dadosResposta.data as LinhaDadosRecebimento[]).map(paraDadosRecebimento),
    };
  }
}
