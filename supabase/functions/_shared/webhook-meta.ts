// _shared/webhook-meta.ts — webhook da Meta (WhatsApp oficial e Instagram), mesmo corpo para os dois.
// Ordem que importa: limite → conta → GET (desafio) | POST: tamanho → ASSINATURA → só então parse.
import { processarEntrada } from "./agente.ts";
import { assinaturaMetaValida } from "./canais/hmac.ts";
import { responderDesafio } from "./canais/meta.ts";
import {
  type Buscador,
  type EntradaCanal,
  LIMITE_TEXTO_SAIDA,
  type Provedor,
} from "./canais/tipos.ts";
import type { SegredoMeta } from "./segredos.ts";
import {
  type ContaCanal,
  type IOWebhook,
  lerCorpoLimitado,
  objetoOuVazio,
  resposta,
  resposta429,
  UUID,
} from "./webhook.ts";

export interface ConfigMeta {
  provedor: Extract<Provedor, "whatsapp_oficial" | "instagram">;
  escopo(contaId: string): string;
  /** Leitura das entradas da conta esperada; metadados incompletos devolvem lista vazia. */
  ler(payload: unknown, metadados: Record<string, unknown>): EntradaCanal[];
  enviar(
    buscador: Buscador,
    a: { segredo: SegredoMeta; metadados: Record<string, unknown>; para: string; texto: string },
  ): Promise<void>;
  /** WhatsApp identifica por telefone (vincula ao CRM); Instagram, por id do remetente. */
  usaTelefone: boolean;
}

function segredoCompleto(s: SegredoMeta | null): s is SegredoMeta {
  return !!s && !!s.accessToken && !!s.appSecret && !!s.verifyToken;
}

export function criarManipuladorMeta(cfg: ConfigMeta, io: IOWebhook) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "GET" && req.method !== "POST") return resposta(405);

    const limite = await io.limite(req);
    if (!limite.permitido) return resposta429(limite.reiniciaEm);

    try {
      const contaId = new URL(req.url).searchParams.get("conta") ?? "";
      if (!UUID.test(contaId)) return resposta(404);
      const conta: ContaCanal | null = await io.carregarConta(contaId, cfg.provedor);
      if (!conta) return resposta(404);
      const segredo = await io.segredo<SegredoMeta>(cfg.escopo(contaId));
      // Conta cadastrada, mas sem as três credenciais: 503 (e não 200) para a Meta não achar que o
      // webhook está saudável antes de a configuração terminar.
      if (!segredoCompleto(segredo)) return resposta(503);

      if (req.method === "GET") return responderDesafio(new URL(req.url), segredo.verifyToken);

      const corpo = await lerCorpoLimitado(req);
      if (corpo === null) return resposta(413);
      // Autenticar o corpo BRUTO antes de interpretá-lo: parsear antes entrega PII a quem não
      // provou conhecer o App Secret.
      if (!(await assinaturaMetaValida(segredo.appSecret, corpo, req.headers.get("x-hub-signature-256")))) {
        return resposta(401);
      }
      let payload: unknown;
      try {
        payload = JSON.parse(new TextDecoder().decode(corpo));
      } catch {
        return resposta(400);
      }

      const metadados = objetoOuVazio(conta.metadados_publicos);
      const entradas = cfg.ler(payload, metadados);
      const contaAtiva = conta.ativa && conta.credenciais_configuradas;
      for (const entrada of entradas) {
        const deps = io.criarDeps({
          contaId,
          usaTelefone: cfg.usaTelefone,
          enviar: (texto) =>
            cfg.enviar(io.buscador, { segredo, metadados, para: entrada.contatoExterno, texto }),
        });
        await processarEntrada(deps, entrada, {
          contaAtiva,
          limiteSaida: LIMITE_TEXTO_SAIDA[cfg.provedor],
        });
      }
      return resposta(200);
    } catch {
      // Erro antes de gravar (ou ao gravar o recibo): 500 faz a Meta reentregar, e o recibo
      // deduplica o que já foi processado. Sem detalhe na resposta nem no log (PII).
      console.warn(JSON.stringify({ ts: new Date().toISOString(), nivel: "warn", fn: cfg.provedor, msg: "falha ao processar webhook" }));
      return resposta(500);
    }
  };
}
