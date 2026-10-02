// _shared/agente.ts — pipeline único de atendimento (ADR-0017), igual para Evolution, WhatsApp
// oficial e Instagram. Tudo que toca rede ou banco entra por `DepsAgente`, então o pipeline é
// testável sem nenhum dos dois e uma correção aqui vale para os três canais.
//
// Ordem, e por quê:
//   1. vincular cliente  — só leitura; falha aqui devolve erro ao provedor, que reentrega.
//   2. registrar recibo  — ANTES de qualquer chamada externa. É o que deduplica reentrega e dois
//                          workers simultâneos. Falha aqui também devolve erro (nada foi gravado).
//   3. daqui em diante  — falha NÃO reenvia: o recibo fecha como `falhou` e o resultado é
//                          devolvido normalmente. Reenviar duplicaria mensagem ao cliente.
import type { EntradaCanal } from "./canais/tipos.ts";
import { type RegraAgente } from "./openrouter.ts";

export type StatusRecibo = "respondido" | "handoff" | "ignorado" | "falhou";
export type ResultadoPipeline = "duplicada" | StatusRecibo;

export interface DepsAgente {
  /** Cliente cadastrado com este contato (telefone). Canais sem telefone devolvem `null`. */
  vincularCliente(contatoExterno: string): Promise<{ id: string; nome: string } | null>;
  registrar(a: {
    clienteId: string | null;
    clienteNome: string;
    entrada: EntradaCanal;
  }): Promise<{ processar: boolean; conversaId: string | null }>;
  concluir(a: {
    conversaId: string;
    origemId: string;
    status: StatusRecibo;
    textoSaida?: string;
    custo?: number | null;
  }): Promise<void>;
  /** Agente ATIVO que atende esta conta, ou `null`. */
  agenteDaConta(): Promise<RegraAgente | null>;
  chaveOpenRouter(agenteId: string): Promise<string | null>;
  historico(conversaId: string): Promise<unknown>;
  gerarResposta(
    regra: RegraAgente,
    chave: string,
    historico: unknown,
  ): Promise<{ texto: string; custo: number | null }>;
  /** Envia texto ao contato desta entrada, pelo mesmo canal por onde ela chegou. */
  enviar(texto: string): Promise<void>;
  log(evento: Record<string, unknown>): void;
}

export interface OpcoesPipeline {
  /** Conta de canal ativa e com credenciais configuradas. */
  contaAtiva: boolean;
  limiteSaida: number;
}

// Pedidos que a IA não deve tratar: vão direto para a mensagem de encaminhamento, sem chamar o
// modelo. Comparado sem acento e sem caixa. `consulta` sozinho NÃO entra: "quero marcar uma
// consulta" é o primeiro contato típico de um lead e não pode virar encaminhamento automático.
const PEDE_HUMANO =
  /\b(humano|atendente|advogad[oa]|juridic[oa]|contrato|pagamento|fatura|boleto|senha|codigo|documento sensivel|falar com (uma )?pessoa)\b/;

export function precisaDeHumano(texto: string): boolean {
  const normalizado = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return PEDE_HUMANO.test(normalizado);
}

export async function processarEntrada(
  deps: DepsAgente,
  entrada: EntradaCanal,
  opcoes: OpcoesPipeline,
): Promise<ResultadoPipeline> {
  const cliente = await deps.vincularCliente(entrada.contatoExterno);
  const recibo = await deps.registrar({
    clienteId: cliente?.id ?? null,
    clienteNome: cliente?.nome ?? entrada.nome ?? "Contato",
    entrada,
  });
  if (!recibo.processar || !recibo.conversaId) return "duplicada";
  const conversaId = recibo.conversaId;

  const fechar = (
    status: StatusRecibo,
    extra: { textoSaida?: string; custo?: number | null } = {},
  ) => deps.concluir({ conversaId, origemId: entrada.origemId, status, ...extra });

  try {
    if (!opcoes.contaAtiva) {
      await fechar("ignorado");
      return "ignorado";
    }
    const agente = await deps.agenteDaConta();
    if (!agente) {
      await fechar("ignorado");
      return "ignorado";
    }

    if (precisaDeHumano(entrada.texto)) {
      const aviso = agente.mensagem_handoff.slice(0, opcoes.limiteSaida);
      await deps.enviar(aviso);
      await fechar("handoff", { textoSaida: aviso });
      return "handoff";
    }

    const chave = await deps.chaveOpenRouter(agente.id);
    if (!chave) {
      await fechar("ignorado");
      return "ignorado";
    }
    const ia = await deps.gerarResposta(agente, chave, await deps.historico(conversaId));
    const resposta = ia.texto.slice(0, opcoes.limiteSaida);
    await deps.enviar(resposta);
    await fechar("respondido", { textoSaida: resposta, custo: ia.custo });
    return "respondido";
  } catch (erro) {
    // Nunca o corpo, o texto do cliente ou o erro do provedor: podem carregar PII ou credencial.
    deps.log({
      nivel: "warn",
      msg: "falha no pipeline do agente",
      tipo: erro instanceof Error ? erro.constructor.name : "desconhecido",
    });
    try {
      await fechar("falhou");
    } catch {
      // Recibo pode ficar `recebido` para inspeção manual; o erro principal já foi registrado.
    }
    return "falhou";
  }
}
