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
  /**
   * Consome UMA resposta de IA da cota deste contato (AV-05). `false` = cota esgotada ou limitador
   * indisponível: o pipeline não chama o modelo e só encaminha à equipe.
   */
  cotaContato(contatoExterno: string): Promise<boolean>;
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

/** Janela em que o mesmo encaminhamento não é repetido (cliente que manda 10 fotos recebe UM aviso). */
export const JANELA_REENCAMINHAMENTO_MS = 10 * 60_000;

/** O último texto do agente nesta conversa é este mesmo encaminhamento, enviado há pouco? */
export function encaminhadoRecentemente(historico: unknown, texto: string, agora = Date.now()): boolean {
  if (!Array.isArray(historico)) return false;
  for (let i = historico.length - 1; i >= 0; i--) {
    const m = historico[i] as { autor?: unknown; texto?: unknown; enviadoEm?: unknown } | null;
    if (m?.autor !== "agente_ia") continue;
    const quando = typeof m.enviadoEm === "string" ? Date.parse(m.enviadoEm) : Number.NaN;
    return m.texto === texto && Number.isFinite(quando) && agora - quando < JANELA_REENCAMINHAMENTO_MS;
  }
  return false;
}

export type Decisao =
  | { tipo: "handoff"; texto: string }
  | { tipo: "sem_chave" }
  | { tipo: "resposta"; texto: string; custo: number | null };

/**
 * O que o agente responde a uma mensagem. É a MESMA função na produção (`processarEntrada`) e no
 * Playground do admin: o teste só vale se o comportamento testado for o que vai ao ar.
 * `historico` já inclui a mensagem nova, como a conversa do banco (autor `cliente` | `agente_ia`).
 */
export async function decidirResposta(
  deps: Pick<DepsAgente, "chaveOpenRouter" | "gerarResposta">,
  regra: RegraAgente,
  textoEntrada: string,
  historico: unknown,
  limiteSaida: number,
): Promise<Decisao> {
  if (precisaDeHumano(textoEntrada)) {
    return { tipo: "handoff", texto: regra.mensagem_handoff.slice(0, limiteSaida) };
  }
  const chave = await deps.chaveOpenRouter(regra.id);
  if (!chave) return { tipo: "sem_chave" };
  const ia = await deps.gerarResposta(regra, chave, historico);
  return { tipo: "resposta", texto: ia.texto.slice(0, limiteSaida), custo: ia.custo };
}

async function historicoSePreciso(
  deps: DepsAgente,
  conversaId: string,
  texto: string,
): Promise<unknown> {
  // Mesma regra de `decidirResposta`: pedido que exige a equipe nem chega ao modelo.
  return precisaDeHumano(texto) ? [] : await deps.historico(conversaId);
}

export async function processarEntrada(
  deps: DepsAgente,
  entrada: EntradaCanal,
  opcoes: OpcoesPipeline,
): Promise<ResultadoPipeline> {
  // Sem telefone comprovado não se tenta vincular a cliente: a conversa fica só com a equipe.
  const naoIdentificada = entrada.identificacao === "nao_identificada";
  const cliente = naoIdentificada ? null : await deps.vincularCliente(entrada.contatoExterno);
  const recibo = await deps.registrar({
    clienteId: cliente?.id ?? null,
    clienteNome: cliente?.nome ?? entrada.nome ?? (naoIdentificada ? "Contato não identificado" : "Contato"),
    entrada,
  });
  if (!recibo.processar || !recibo.conversaId) return "duplicada";
  const conversaId = recibo.conversaId;

  const fechar = (
    status: StatusRecibo,
    extra: { textoSaida?: string; custo?: number | null } = {},
  ) => deps.concluir({ conversaId, origemId: entrada.origemId, status, ...extra });

  try {
    // Contato não identificado: mensagem guardada para a equipe; ninguém responde por palpite.
    if (naoIdentificada || !opcoes.contaAtiva) {
      await fechar("ignorado");
      return "ignorado";
    }
    const agente = await deps.agenteDaConta();
    if (!agente) {
      await fechar("ignorado");
      return "ignorado";
    }

    const encaminhar = async (): Promise<ResultadoPipeline> => {
      const texto = agente.mensagem_handoff.slice(0, opcoes.limiteSaida);
      if (encaminhadoRecentemente(await deps.historico(conversaId), texto)) {
        await fechar("handoff"); // já avisado há pouco: registra, não repete a mensagem
        return "handoff";
      }
      await deps.enviar(texto);
      await fechar("handoff", { textoSaida: texto });
      return "handoff";
    };

    // Anexo, figurinha ou tipo não suportado: o agente não interpreta, só encaminha à equipe.
    if (entrada.encaminhar) return await encaminhar();

    // AV-05: cada resposta de IA custa no provedor. A cota é por CONTATO, antes da chamada paga:
    // um remetente que fala demais não esgota a conta nem o balde dos demais. Pedido que já vai
    // para a equipe (`precisaDeHumano`) não chama o modelo e, por isso, não consome cota.
    if (!precisaDeHumano(entrada.texto) && !(await deps.cotaContato(entrada.contatoExterno))) {
      // Sem telefone no log: o excesso fica observável, o contato não.
      deps.log({ nivel: "warn", msg: "cota de IA do contato esgotada" });
      return await encaminhar();
    }

    const decisao = await decidirResposta(
      deps,
      agente,
      entrada.texto,
      // O histórico só é lido se a decisão chegar à IA; o handoff e a falta de chave não precisam dele.
      await historicoSePreciso(deps, conversaId, entrada.texto),
      opcoes.limiteSaida,
    );
    if (decisao.tipo === "handoff") {
      await deps.enviar(decisao.texto);
      await fechar("handoff", { textoSaida: decisao.texto });
      return "handoff";
    }
    if (decisao.tipo === "sem_chave") {
      await fechar("ignorado");
      return "ignorado";
    }
    await deps.enviar(decisao.texto);
    await fechar("respondido", { textoSaida: decisao.texto, custo: decisao.custo });
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
