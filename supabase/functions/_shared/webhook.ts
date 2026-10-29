// _shared/webhook.ts — E/S injetável dos webhooks de canal. As Edge Functions finas montam o real
// (`io-supabase.ts`); os testes montam um falso e exercitam o comportamento HTTP inteiro:
// autenticar antes de parsear, recusar o que não é da conta, deduplicar, não vazar erro.
import type { DepsAgente } from "./agente.ts";
import type { Buscador, Provedor } from "./canais/tipos.ts";
import type { ProvedorTranscricao } from "./canais/transcricao.ts";
import { lerCorpoComLimite } from "./corpo.ts";

export interface ContaCanal {
  id: string;
  ativa: boolean;
  credenciais_configuradas: boolean;
  metadados_publicos: unknown;
  /** Evolution (E13-S15): instância criada pelo produto e estado provado da conexão. */
  nome_instancia?: string | null;
  estado_conexao?: string;
  /** Número cadastrado do canal (só dígitos): o pareado precisa bater com ele. */
  identificador?: string;
}

export interface IOWebhook {
  limite(req: Request): Promise<{ permitido: boolean; reiniciaEm: Date | null }>;
  /** Conta do provedor pedido, não apagada; `null` se não existe ou é de outro provedor. */
  carregarConta(contaId: string, provedor: Provedor): Promise<ContaCanal | null>;
  /** Item do Vault já em objeto; `null` se não existe. Erro de Vault propaga. */
  segredo<T>(escopo: string): Promise<T | null>;
  criarDeps(a: {
    contaId: string;
    usaTelefone: boolean;
    enviar: (texto: string) => Promise<void>;
  }): DepsAgente;
  buscador: Buscador;
}

/** E/S extra do webhook da Evolution (E13-S15): servidor, estado da conexão e anexos. */
export interface IOEvolution extends IOWebhook {
  /** Servidor Evolution COMPATÍVEL com a chave já decifrada; `null` se não houver. */
  servidorEvolution(): Promise<{ urlBase: string; apiKey: string } | null>;
  atualizarConexao(contaId: string, estado: string, codigoErro: string | null): Promise<void>;
  /** Já existe recibo para esta mensagem? Evita baixar a mesma mídia de novo numa reentrega. */
  jaRecebida(contaId: string, origemId: string): Promise<boolean>;
  /** Guarda o anexo no bucket privado e devolve o caminho. */
  guardarAnexo(a: { contaId: string; origemId: string; bytes: Uint8Array; mime: string }): Promise<string>;
  /** Revalida o destino da chamada (SSRF/DNS). Lança se recusar. */
  validarUrl(url: string): Promise<void>;
  /** Transcrição de áudio LIGADA com a chave já decifrada; `null` = desligada ou sem chave (E13-S15, ADR-0022). */
  transcricao(): Promise<ConfigTranscricao | null>;
  /** Teto de gasto: transcrições por janela. Negar não perde a mensagem (cai no encaminhamento). */
  limiteTranscricao(req: Request): Promise<{ permitido: boolean; reiniciaEm: Date | null }>;
}

export interface ConfigTranscricao {
  provedor: ProvedorTranscricao;
  modelo: string;
  idioma: string | null;
  chave: string;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const LIMITE_CORPO = 64 * 1024;

/** Resposta mínima ao provedor: nunca descreve o motivo (não é canal de diagnóstico). */
export function resposta(status: number, ok = status < 400): Response {
  return new Response(JSON.stringify({ ok }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function resposta429(reiniciaEm: Date | null): Response {
  const segundos = reiniciaEm ? Math.max(1, Math.ceil((reiniciaEm.getTime() - Date.now()) / 1000)) : 60;
  return new Response(JSON.stringify({ ok: false }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(segundos) },
  });
}

/** Lê o corpo respeitando o limite de bytes em stream (vale também sem `content-length`, AV-07). */
export function lerCorpoLimitado(req: Request): Promise<Uint8Array | null> {
  return lerCorpoComLimite(req, LIMITE_CORPO);
}

export function objetoOuVazio(valor: unknown): Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}
