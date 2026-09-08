// _shared/rate-limit.ts — teto por origem e janela nas Edge Functions (E14-S01, fecha SD-01).
//
// Por que não um contador em memória: cada invocação pode cair num isolate diferente, então uma
// variável de módulo conta POR ISOLATE — na prática, não conta nada. O estado vive em
// `seguranca.rate_limit` e a contagem é feita por `seguranca.consumir_cota`, que resolve a corrida
// num único round-trip (`ON CONFLICT DO UPDATE`). SELECT seguido de UPDATE deixaria dois pedidos
// simultâneos passarem pelo teto.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSupabaseServiceKey } from "./auth.ts";

export interface OpcoesLimite {
  req: Request;
  /** Nome da rota — entra na chave, então o teto de uma função não consome o da outra. */
  rota: string;
  teto: number;
  janelaSegundos: number;
  /**
   * `true` (padrão): limitador indisponível NEGA a requisição. É o que `seguranca/os-grade.md`
   * pede no caminho sensível, e a consequência precisa ser dita em voz alta — banco fora
   * significa ninguém consegue autenticar. A alternativa é que uma falha de banco vire janela
   * aberta para força bruta.
   *
   * `false` só para caminho anônimo que não dá acesso a nada (telemetria): recusar um relatório
   * de erro por indisponibilidade do limitador apagaria log exatamente quando algo já quebrou.
   */
  falharFechado?: boolean;
}

export interface Resultado {
  permitido: boolean;
  reiniciaEm: Date | null;
}

/**
 * Origem do pedido. Atrás do proxy do Netlify e do Supabase, `remoteAddr` é o proxy — o IP do
 * cliente vem no primeiro elemento de `x-forwarded-for`.
 */
function origem(req: Request): string {
  const encaminhado = req.headers.get("x-forwarded-for") ?? "";
  const primeiro = encaminhado.split(",")[0]?.trim();
  return primeiro || req.headers.get("cf-connecting-ip") || "desconhecido";
}

/**
 * Chave hasheada. IP é dado pessoal sob a LGPD: guardá-lo em claro criaria obrigação de retenção
 * e export numa tabela que existe só para contar. O segredo impede que alguém com acesso de
 * leitura à tabela reconstrua o IP por força bruta sobre o espaço de endereços (que é pequeno).
 */
async function chaveDe(req: Request, rota: string): Promise<string> {
  const segredo = Deno.env.get("RATE_LIMIT_SECRET") ?? "";
  const dados = new TextEncoder().encode(`${origem(req)}:${segredo}:${rota}`);
  const digest = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function checarLimite({
  req,
  rota,
  teto,
  janelaSegundos,
  falharFechado = true,
}: OpcoesLimite): Promise<Resultado> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      getSupabaseServiceKey(),
    );
    const { data, error } = await supabase.schema("seguranca").rpc("consumir_cota", {
      p_chave: await chaveDe(req, rota),
      p_teto: teto,
      p_janela_segundos: janelaSegundos,
    });
    if (error) throw error;

    const linha = Array.isArray(data) ? data[0] : data;
    const permitido = Boolean(linha?.permitido);
    const reiniciaEm = linha?.reinicia_em ? new Date(linha.reinicia_em) : null;

    if (!permitido) {
      // AC-5: excesso precisa ser observável para os tetos serem ajustáveis com dado real.
      // Sem o IP em claro — seria contraditório com o hash da chave.
      console.warn(
        JSON.stringify({
          ts: new Date().toISOString(),
          nivel: "warn",
          tipo: "rate-limit-excedido",
          rota,
          teto,
          janelaSegundos,
        }),
      );
    }
    return { permitido, reiniciaEm };
  } catch (erro) {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        nivel: "error",
        tipo: "rate-limit-indisponivel",
        rota,
        falharFechado,
        msg: erro instanceof Error ? erro.message : String(erro),
      }),
    );
    return { permitido: !falharFechado, reiniciaEm: null };
  }
}

/** Resposta padrão de excesso. `Retry-After` em segundos, como manda o RFC 9110. */
export function resposta429(reiniciaEm: Date | null, cors: Record<string, string>): Response {
  const segundos = reiniciaEm
    ? Math.max(1, Math.ceil((reiniciaEm.getTime() - Date.now()) / 1000))
    : 60;
  return new Response(JSON.stringify({ erro: "Muitas requisições. Tente de novo em instantes." }), {
    status: 429,
    headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(segundos) },
  });
}

/**
 * Tetos por função (AC-1). Números são ponto de partida, não verdade — o log de excesso (AC-5)
 * existe para poder ajustá-los com dado real.
 */
export const TETOS = {
  "sessao-login": { teto: 10, janelaSegundos: 900 },
  "sessao-refresh": { teto: 30, janelaSegundos: 60 },
  "sessao-logout": { teto: 30, janelaSegundos: 60 },
  "telemetria-erro": { teto: 60, janelaSegundos: 60, falharFechado: false },
  // Formulário público: 5 por hora e folga larga para um visitante de verdade (que envia uma vez)
  // e barreira estreita para script de spam. `fail-closed` implícito — sem limitador, formulário
  // público é canal aberto de escrita no CRM.
  "lead-capturar": { teto: 5, janelaSegundos: 3600 },
  // Painel administrativo: poucas gravações, mas sempre fail-closed pois troca chaves e webhook.
  "integracoes-ia-salvar": { teto: 10, janelaSegundos: 3600 },
  // Evolution pode concentrar tráfego em um IP; teto protege Vault/LLM sem bloquear uso normal.
  "evolution-webhook": { teto: 120, janelaSegundos: 60 },
} as const;
