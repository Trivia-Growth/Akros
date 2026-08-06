import { container } from "@/app/di";
import { useEffect, useState } from "react";
import type { Documento } from "../domain/types";

export function useDocumentosCliente(clienteId: string | undefined): Documento[] {
  const [documentos, setDocumentos] = useState<Documento[]>([]);

  useEffect(() => {
    if (!clienteId) {
      setDocumentos([]);
      return;
    }
    container.documentos.listarPorCliente(clienteId).then(setDocumentos);
  }, [clienteId]);

  return documentos;
}
