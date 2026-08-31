import { useSessaoStore } from "@/features/sessao/application/store";
import { isDemoMode } from "@/shared/lib/env";
import { type EventoErro, montarEvento } from "./sanitizar";

export type { EventoErro } from "./sanitizar";

const ENDPOINT = "/api/telemetria/erro";

/**
 * Sink de erro de cliente (E16-S01, AC-3).
 *
 * Antes disto, um crash em produção era invisível: `shared/lib/log.ts` escreve local e o
 * `ErrorBoundary` de E15-S01 mostrava o fallback sem que ninguém ficasse sabendo. Modo de falha
 * completo era tela de erro sem telemetria (SD-10 em `docs/SECURITY_DEBT.md`).
 *
 * Regra que não se dobra: **o envio nunca pode quebrar o fallback**. Se o transporte falhar, o
 * usuário não pode nem perceber. Por isso tudo aqui é `void`, nada é `await`ado pelo chamador, e
 * a falha do envio vira um `console.warn` — não um erro novo dentro do tratador de erro.
 */
export function reportarErro(erro: unknown, area: string): void {
  const sessao = useSessaoStore.getState().sessao;
  const evento = montarEvento({
    erro,
    area,
    rota: typeof location !== "undefined" ? location.pathname : "",
    usuarioId: sessao?.usuario.id,
    papel: sessao?.usuario.papel,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  });

  // Em modo demo o sink é o console: não há para onde mandar e nem faz sentido — o dado é
  // fictício e quem está olhando é quem provocou o erro.
  if (isDemoMode) {
    console.warn("[telemetria]", evento);
    return;
  }

  enviar(evento);
}

function enviar(evento: EventoErro): void {
  const corpo = JSON.stringify(evento);

  try {
    // `sendBeacon` sobrevive à navegação e ao fechamento da aba, que é exatamente quando um erro
    // grave costuma acontecer. Devolve `false` se o payload for grande demais para a fila.
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const ok = navigator.sendBeacon(ENDPOINT, new Blob([corpo], { type: "application/json" }));
      if (ok) return;
    }
    // `keepalive` faz o mesmo papel no caminho de fallback.
    void fetch(ENDPOINT, {
      method: "POST",
      body: corpo,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {
      /* silêncio deliberado: ver regra acima */
    });
  } catch {
    console.warn("[telemetria] não foi possível reportar o erro");
  }
}
