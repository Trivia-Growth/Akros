// _shared/segredos.ts — formas dos segredos no Vault e helpers puros (sem dependência externa, para
// que o pipeline e os testes não puxem o SDK do Supabase).

/**
 * Segredo da conta Evolution: só o capability token do webhook. A chave global do servidor mora em
 * `evolution-servidor:<id>` (E13-S15, ADR-0021) e a instância é acessada com ela.
 */
export interface SegredoEvolution {
  webhookToken: string;
}

export interface SegredoServidorEvolution {
  apiKey: string;
}

export interface SegredoOpenRouter {
  apiKey: string;
}

/** Chave do provedor de transcrição de áudio (E13-S15, ADR-0022): uma por instalação. */
export interface SegredoTranscricao {
  apiKey: string;
}

/** Segredos de uma conta Meta (WhatsApp oficial ou Instagram), guardados juntos no Vault. */
export interface SegredoMeta {
  /** Token permanente (usuário do sistema) ou Page Access Token: envia mensagens. */
  accessToken: string;
  /** App Secret do app na Meta: assina os webhooks (X-Hub-Signature-256). */
  appSecret: string;
  /** Token que o administrador cadastra no painel da Meta para o desafio GET. */
  verifyToken: string;
}

export function escopoEvolution(contaId: string): string {
  return `evolution:${contaId}`;
}

export function escopoServidorEvolution(servidorId: string): string {
  return `evolution-servidor:${servidorId}`;
}

export function escopoMetaWhatsApp(contaId: string): string {
  return `meta-whatsapp:${contaId}`;
}

export function escopoMetaInstagram(contaId: string): string {
  return `meta-instagram:${contaId}`;
}

export function escopoOpenRouter(agenteId: string): string {
  return `openrouter:${agenteId}`;
}

export function escopoTranscricao(configId: string): string {
  return `transcricao:${configId}`;
}

export function tokenAleatorio(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function urlSemBarraFinal(valor: string): string {
  return valor.replace(/\/+$/, "");
}
