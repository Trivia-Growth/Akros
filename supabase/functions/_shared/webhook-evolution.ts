// _shared/webhook-evolution.ts — webhook da Evolution API.
// Autenticação por capability token por conta, em cabeçalho (ADR-0012): a URL não carrega segredo.
import { processarEntrada } from "./agente.ts";
import { enviarEvolution, lerEntradaEvolution } from "./canais/evolution.ts";
import { LIMITE_TEXTO_SAIDA } from "./canais/tipos.ts";
import { constantTimeEqual } from "./crypto.ts";
import { escopoEvolution, type SegredoEvolution, urlSemBarraFinal } from "./segredos.ts";
import {
  type ContaCanal,
  type IOWebhook,
  lerCorpoLimitado,
  objetoOuVazio,
  resposta,
  resposta429,
  UUID,
} from "./webhook.ts";

function dadosEvolution(conta: ContaCanal): { baseUrl: string; instancia: string } | null {
  const meta = objetoOuVazio(conta.metadados_publicos);
  const baseUrl = typeof meta.baseUrl === "string" ? meta.baseUrl.trim() : "";
  const instancia = typeof meta.instancia === "string" ? meta.instancia.trim() : "";
  if (!baseUrl || !instancia) return null;
  try {
    if (new URL(baseUrl).protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { baseUrl: urlSemBarraFinal(baseUrl), instancia };
}

export function criarManipuladorEvolution(io: IOWebhook) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST") return resposta(405);
    const limite = await io.limite(req);
    if (!limite.permitido) return resposta429(limite.reiniciaEm);

    try {
      const contaId = new URL(req.url).searchParams.get("conta") ?? "";
      if (!UUID.test(contaId)) return resposta(404);
      const conta = await io.carregarConta(contaId, "evolution");
      if (!conta) return resposta(404);

      const segredo = await io.segredo<SegredoEvolution>(escopoEvolution(contaId));
      const recebido = req.headers.get("x-akros-webhook") ?? "";
      if (!segredo?.webhookToken || !constantTimeEqual(recebido, segredo.webhookToken)) {
        return resposta(401);
      }

      const corpo = await lerCorpoLimitado(req);
      if (corpo === null) return resposta(413);
      let payload: unknown;
      try {
        payload = JSON.parse(new TextDecoder().decode(corpo));
      } catch {
        return resposta(400);
      }
      const entrada = lerEntradaEvolution(payload);
      if (!entrada) return resposta(200);

      const dados = dadosEvolution(conta);
      const deps = io.criarDeps({
        contaId,
        usaTelefone: true,
        enviar: (texto) => {
          if (!dados) throw new Error("conta Evolution sem URL ou instância");
          return enviarEvolution(io.buscador, {
            ...dados,
            apiKey: segredo.apiKey,
            numero: entrada.contatoExterno,
            texto,
          });
        },
      });
      await processarEntrada(deps, entrada, {
        contaAtiva: conta.ativa && conta.credenciais_configuradas && dados !== null,
        limiteSaida: LIMITE_TEXTO_SAIDA.evolution,
      });
      return resposta(200);
    } catch {
      console.warn(JSON.stringify({ ts: new Date().toISOString(), nivel: "warn", fn: "evolution-webhook", msg: "falha ao processar webhook" }));
      return resposta(500);
    }
  };
}
