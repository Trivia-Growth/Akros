import { obterNotificacoesAdminReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { MensagemNaoVista } from "../domain/types";

const INTERVALO_MS = 30_000;
const consulta = obterNotificacoesAdminReal();

/** E08-S06 — badge do sininho do admin: mensagem de cliente no chat do portal que ainda não foi
 *  vista. Sondagem por intervalo (sem realtime nesta entrega). */
export function useNotificacoesAdmin() {
  const [itens, setItens] = useState<MensagemNaoVista[]>([]);

  const atualizar = useCallback(() => {
    consulta
      .naoVistas()
      .then(setItens)
      .catch(() => {});
  }, []);

  useEffect(() => {
    atualizar();
    const id = setInterval(atualizar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [atualizar]);

  const marcarVisto = useCallback(() => {
    consulta
      .marcarVisto()
      .then(atualizar)
      .catch(() => {});
  }, [atualizar]);

  return { itens, marcarVisto };
}
