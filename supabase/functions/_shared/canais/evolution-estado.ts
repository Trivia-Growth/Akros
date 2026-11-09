// _shared/canais/evolution-estado.ts — estados do canal Evolution, compatibilidade e número canônico
// (E13-S15, FR-003, FR-008, FR-011). Puro: sem rede nem banco.

/**
 * Capacidades que um servidor precisa PROVAR no smoke para a versão entrar na matriz e aceitar
 * instâncias (FR-003). Todas são prováveis numa instância efêmera, SEM número pareado.
 */
export const CAPACIDADES_OBRIGATORIAS = [
  "instanceCreate",
  "qr",
  "connectionState",
  "webhookHeaders",
  "webhookEvents",
] as const;

/**
 * Envio de texto só se prova com número pareado: fica de fora do "pode conectar" (senão seria preciso
 * conectar para poder conectar) e vira condição para ATIVAR o canal. É provada pela mensagem de teste
 * enviada pelo próprio produto (`enviar_teste`) ou pelo smoke com instância pareada.
 */
export const CAPACIDADE_DE_ENVIO = "sendText" as const;

export type Capacidade = typeof CAPACIDADES_OBRIGATORIAS[number] | typeof CAPACIDADE_DE_ENVIO | "deliveryStatus" | "deleteInstance";

export const CAPACIDADES_CONHECIDAS: readonly string[] = [
  ...CAPACIDADES_OBRIGATORIAS,
  CAPACIDADE_DE_ENVIO,
  "deliveryStatus",
  "deleteInstance",
];

export type EstadoConexao =
  | "sem_credencial"
  | "configuracao_incompleta"
  | "aguardando_pareamento"
  | "conectado_verificado"
  | "desconectado"
  | "erro";

export const ESTADOS_CONEXAO: readonly EstadoConexao[] = [
  "sem_credencial",
  "configuracao_incompleta",
  "aguardando_pareamento",
  "conectado_verificado",
  "desconectado",
  "erro",
];

/** Eventos do webhook que a instância precisa assinar. Sem outros: superfície mínima. */
export const EVENTOS_DO_WEBHOOK = [
  "QRCODE_UPDATED",
  "CONNECTION_UPDATE",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "SEND_MESSAGE",
] as const;

export const CABECALHO_DO_WEBHOOK = "x-akros-webhook";

export interface LinhaCompatibilidade {
  capacidades: readonly string[];
  afetadaLogout?: boolean;
}

export interface Compatibilidade {
  compativel: boolean;
  motivo?: string;
}

/** `null` = versão fora da matriz (nunca provada neste projeto). */
export function avaliarCompatibilidade(versao: string, linha: LinhaCompatibilidade | null): Compatibilidade {
  if (!linha) {
    return {
      compativel: false,
      motivo: `A versão ${versao} ainda não foi provada neste projeto. Rode o smoke de contrato e registre a versão.`,
    };
  }
  const faltando = CAPACIDADES_OBRIGATORIAS.filter((c) => !linha.capacidades.includes(c));
  if (faltando.length > 0) {
    return { compativel: false, motivo: `A versão ${versao} não provou: ${faltando.join(", ")}.` };
  }
  return { compativel: true };
}

const TRANSICOES: Record<EstadoConexao, readonly EstadoConexao[]> = {
  sem_credencial: ["configuracao_incompleta", "erro"],
  configuracao_incompleta: ["configuracao_incompleta", "aguardando_pareamento", "erro"],
  aguardando_pareamento: ["aguardando_pareamento", "conectado_verificado", "configuracao_incompleta", "desconectado", "erro"],
  conectado_verificado: ["conectado_verificado", "desconectado", "aguardando_pareamento", "configuracao_incompleta", "erro"],
  desconectado: ["desconectado", "conectado_verificado", "aguardando_pareamento", "configuracao_incompleta", "erro"],
  erro: ["erro", "configuracao_incompleta", "aguardando_pareamento", "desconectado", "conectado_verificado"],
};

export function transicaoPermitida(de: EstadoConexao, para: EstadoConexao): boolean {
  return TRANSICOES[de].includes(para);
}

/**
 * Número só com dígitos, na forma canônica de comparação. No Brasil o WhatsApp às vezes entrega o
 * celular sem o nono dígito (55 + DDD + 8 dígitos): os dois lados são reduzidos à forma sem ele —
 * a mesma regra de `crm.normalizar_telefone` no banco.
 */
export function telefoneCanonico(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  return /^55\d{2}9\d{8}$/.test(digitos) ? digitos.slice(0, 4) + digitos.slice(5) : digitos;
}

export function numerosIguais(a: string, b: string): boolean {
  const x = telefoneCanonico(a);
  const y = telefoneCanonico(b);
  return x.length >= 8 && x === y;
}

/** Nome remoto da instância: derivado do canal, nunca escolhido pelo navegador (FR-005). */
export function nomeDaInstancia(contaId: string): string {
  return `akros-${contaId.replace(/-/g, "").slice(0, 24)}`;
}

export const ESCOPO_SERVIDOR = (servidorId: string) => `evolution-servidor:${servidorId}`;
