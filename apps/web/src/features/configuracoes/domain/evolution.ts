// E13-S15 — canal Evolution (WhatsApp não oficial): servidor, matriz de compatibilidade e estado
// de conexão. Tipos puros, sem I/O. Segredos (chave do servidor, token do webhook) NUNCA aparecem
// aqui: o front só conhece o indício de 4 caracteres.

export type EstadoConexao =
  | "sem_credencial"
  | "configuracao_incompleta"
  | "aguardando_pareamento"
  | "conectado_verificado"
  | "desconectado"
  | "erro";

export type EstadoServidor = "pendente" | "compativel" | "incompativel";

/** Capacidades provadas no smoke que liberam criar instância. Espelha o servidor. */
export const CAPACIDADES_OBRIGATORIAS = [
  "instanceCreate",
  "qr",
  "connectionState",
  "webhookHeaders",
  "webhookEvents",
] as const;

export const CAPACIDADE_DE_ENVIO = "sendText";

export interface ServidorEvolution {
  urlBase: string;
  versao: string | null;
  estado: EstadoServidor;
  motivo: string | null;
  /** Últimos 4 caracteres da chave, só para reconhecer qual é. */
  indicio: string;
}

export interface CompatibilidadeEvolution {
  versao: string;
  capacidades: string[];
  afetadaLogout: boolean;
  evidencia: string;
}

export interface CanalEvolution {
  id: string;
  nomeExibicao: string;
  /** Só dígitos, com DDI. */
  numero: string;
  ativa: boolean;
  estadoConexao: EstadoConexao;
  ultimoErroCodigo: string | null;
  aceiteRiscoEm: string | null;
}

export interface DadosEvolution {
  servidor: ServidorEvolution | null;
  compatibilidade: CompatibilidadeEvolution[];
  canais: CanalEvolution[];
}

export interface ResultadoServidor {
  estado: EstadoServidor;
  versao: string;
  indicio: string;
  motivo?: string;
  afetadaLogout: boolean;
}

export interface ResultadoEstado {
  estado: EstadoConexao;
  numeroDivergente?: boolean;
  semNumero?: boolean;
}

/** Erro de uma ação do canal: `codigo` mapeia para texto traduzido; `message` é o texto do servidor. */
export class ErroCanalEvolution extends Error {
  constructor(
    public readonly codigo: string,
    message: string,
  ) {
    super(message);
  }
}

/** A versão informada está na matriz com a capacidade de envio provada? */
export function envioProvado(
  servidor: ServidorEvolution | null,
  matriz: CompatibilidadeEvolution[],
): boolean {
  if (!servidor?.versao) return false;
  return (
    matriz.find((m) => m.versao === servidor.versao)?.capacidades.includes(CAPACIDADE_DE_ENVIO) ??
    false
  );
}

export function versaoAfetadaPorLogout(
  servidor: ServidorEvolution | null,
  matriz: CompatibilidadeEvolution[],
): boolean {
  if (!servidor?.versao) return false;
  return matriz.find((m) => m.versao === servidor.versao)?.afetadaLogout ?? false;
}

/**
 * Próximo passo do canal, por estado. A tela mostra UM botão principal por vez; não há botão de
 * "reiniciar por logout" em lugar nenhum (E13-S15, FR-019).
 */
export type PassoCanal = "preparar" | "parear" | "verificar" | "operar";

export function proximoPasso(estado: EstadoConexao): PassoCanal {
  switch (estado) {
    case "sem_credencial":
    case "configuracao_incompleta":
    case "erro":
      return "preparar";
    case "aguardando_pareamento":
    case "desconectado":
      return "parear";
    case "conectado_verificado":
      return "operar";
  }
}
