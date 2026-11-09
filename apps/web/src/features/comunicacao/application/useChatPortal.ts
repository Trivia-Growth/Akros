import { getSupabase } from "@/shared/supabase/client";
import { useCallback, useState } from "react";

const CABECALHO_CSRF = { "x-akros-csrf": "1" };

/** E08-S05 — envia mensagem no chat do portal (cliente ou admin). */
export function useChatPortal() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = useCallback(async (clienteId: string, conteudo: string) => {
    if (!conteudo.trim()) return false;
    setEnviando(true);
    setErro(null);
    try {
      const { error } = await getSupabase().functions.invoke("comunicacao-chat-portal", {
        headers: CABECALHO_CSRF,
        body: { clienteId, conteudo },
      });
      if (error) throw error;
      return true;
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : "envio_falhou");
      return false;
    } finally {
      setEnviando(false);
    }
  }, []);

  return { enviar, enviando, erro };
}
