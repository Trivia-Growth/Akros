// _shared/playground.ts — Playground do agente (E13-S14): o administrador conversa com o agente sem
// canal, sem WhatsApp e sem gravar nada. Roda a MESMA decisão da produção (`decidirResposta`:
// encaminhar à equipe ou chamar a IA com as mesmas instruções), então o que se vê aqui é o que o
// cliente receberia.
//
// Sem estado no servidor: o navegador manda a conversa de teste a cada mensagem. Custa dinheiro de
// LLM, então tem teto de uso, só admin e tamanho máximo de entrada.
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { type DepsAgente, decidirResposta } from "./agente.ts";
import { HttpError } from "./auth.ts";
import { LIMITE_TEXTO_SAIDA } from "./canais/tipos.ts";
import { corsHeaders } from "./cors.ts";
import { requireCsrfHeader } from "./csrf.ts";
import { ErroIA, explicarErroIA, instrucoes, modeloDoAgente, type RegraAgente } from "./openrouter.ts";

const MAX_BYTES = 64 * 1024;
const texto = z.string().trim().min(1).max(2000);

export const EntradaPlayground = z
  .object({
    agenteId: z.string().uuid(),
    /** Conversa de teste até aqui (sem a mensagem nova). */
    mensagens: z
      .array(z.object({ autor: z.enum(["cliente", "agente_ia"]), texto }).strict())
      .max(20),
    texto,
  })
  .strict();

export interface IOPlayground {
  limite(req: Request): Promise<{ permitido: boolean; reiniciaEm: Date | null }>;
  /** Lança HttpError 401/403 se não for admin autenticado. */
  autenticarAdmin(req: Request): Promise<void>;
  carregarAgente(id: string): Promise<RegraAgente | null>;
  deps: Pick<DepsAgente, "chaveOpenRouter" | "gerarResposta">;
  agora(): number;
}

function json(corpo: unknown, status: number, cors: Record<string, string>, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });
}

export function criarManipuladorPlayground(io: IOPlayground) {
  return async (req: Request): Promise<Response> => {
    const cors = corsHeaders(req.headers.get("Origin"));
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return new Response(null, { status: 405, headers: cors });

    const limite = await io.limite(req);
    if (!limite.permitido) {
      const segundos = limite.reiniciaEm
        ? Math.max(1, Math.ceil((limite.reiniciaEm.getTime() - io.agora()) / 1000))
        : 60;
      return json({ erro: "Muitos testes em pouco tempo. Aguarde um instante." }, 429, cors, {
        "Retry-After": String(segundos),
      });
    }

    try {
      requireCsrfHeader(req);
      await io.autenticarAdmin(req);

      const bruto = await req.text();
      if (new TextEncoder().encode(bruto).byteLength > MAX_BYTES) throw new HttpError(413, "Conversa grande demais");
      let entrada: z.infer<typeof EntradaPlayground>;
      try {
        entrada = EntradaPlayground.parse(JSON.parse(bruto));
      } catch {
        throw new HttpError(400, "Dados inválidos");
      }

      const agente = await io.carregarAgente(entrada.agenteId);
      if (!agente) throw new HttpError(404, "Agente não encontrado");

      // Mesmo formato do histórico da conversa em produção (inclui a mensagem nova).
      const historico = [...entrada.mensagens, { autor: "cliente" as const, texto: entrada.texto }];
      const inicio = io.agora();
      const decisao = await decidirResposta(
        io.deps,
        agente,
        entrada.texto,
        historico,
        LIMITE_TEXTO_SAIDA.evolution,
      );
      const ms = Math.max(0, io.agora() - inicio);

      if (decisao.tipo === "sem_chave") {
        throw new HttpError(400, "O agente não tem chave OpenRouter. Salve a chave na configuração do agente.");
      }
      return json(
        {
          tipo: decisao.tipo,
          resposta: decisao.texto,
          custo: decisao.tipo === "resposta" ? decisao.custo : null,
          modelo: modeloDoAgente(agente),
          ms,
          // As instruções que o modelo recebe: é o que o administrador "alimenta" hoje (orientação e
          // tom) mais as regras fixas. Não é segredo; aparece para ajudar a calibrar o agente.
          instrucoes: instrucoes(agente),
        },
        200,
        cors,
      );
    } catch (erro) {
      if (erro instanceof HttpError) return json({ erro: erro.message }, erro.status, cors);
      if (erro instanceof ErroIA) return json({ erro: explicarErroIA(erro) }, 502, cors);
      // Nada do erro original na resposta nem no log: pode carregar chave, texto ou PII.
      console.warn(JSON.stringify({ ts: new Date().toISOString(), nivel: "warn", fn: "agente-playground", msg: "falha" }));
      return json({ erro: "Não foi possível testar agora." }, 500, cors);
    }
  };
}
