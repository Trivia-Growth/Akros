import { container } from "@/app/di";
import { useEffect, useState } from "react";
import type { Reuniao } from "../domain/types";

export function useReunioesCliente(clienteId: string | undefined): Reuniao[] {
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);

  useEffect(() => {
    if (!clienteId) {
      setReunioes([]);
      return;
    }
    container.agenda.listarPorCliente(clienteId).then(setReunioes);
  }, [clienteId]);

  return reunioes;
}
