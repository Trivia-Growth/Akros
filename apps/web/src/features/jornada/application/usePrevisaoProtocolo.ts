import { obterConsultaProgressoReal } from "@/app/real-repositories";
import { useEffect, useState } from "react";
import type { PrevisaoProtocolo, ProgressoCaso } from "./calcular-previsao";

/** E03-S07 (Fase 9/US7) — progresso e previsão de protocolo do caso ativo (portal). */
export function usePrevisaoProtocolo() {
  const [progresso, setProgresso] = useState<ProgressoCaso | null>(null);
  const [previsao, setPrevisao] = useState<PrevisaoProtocolo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const resultado = await obterConsultaProgressoReal().carregarCliente();
        if (cancelado) return;
        setProgresso(resultado.progresso);
        setPrevisao(resultado.previsao);
      } catch (causa) {
        if (cancelado) return;
        setErro(
          causa instanceof Error ? causa : new Error("Não foi possível carregar a previsão."),
        );
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  return { progresso, previsao, carregando, erro };
}
