import { obterRepositorioProgramas, obterRepositorioRequisitos } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { Programa } from "../domain/types";
import type { RequisitoDocumentoRepository } from "./ports";

/** E06-S05/ADR-0013 — repositório de RequisitoDocumento, resolvido preguiçosamente
 * (demo/real). `null` enquanto resolve ou se falhar; a UI cai no comportamento de
 * draft nesse interim. */
export function useRequisitoDocumentoRepo(): RequisitoDocumentoRepository | null {
  const [repo, setRepo] = useState<RequisitoDocumentoRepository | null>(null);

  useEffect(() => {
    let ativo = true;
    obterRepositorioRequisitos()
      .then((resolvido) => {
        if (ativo) setRepo(resolvido);
      })
      .catch(() => {
        if (ativo) setRepo(null);
      });
    return () => {
      ativo = false;
    };
  }, []);

  return repo;
}

export function useProgramasReais(): {
  programas: Programa[];
  carregando: boolean;
  erro: Error | null;
  duplicar: (programaId: string) => Promise<Programa | null>;
  salvar: (programa: Programa) => Promise<void>;
  refetch: () => Promise<void>;
} {
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setProgramas(await (await obterRepositorioProgramas()).listar());
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar programas."));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const salvar = useCallback(
    async (programa: Programa) => {
      await (await obterRepositorioProgramas()).salvar(programa);
      await refetch();
    },
    [refetch],
  );

  const duplicar = useCallback(
    async (programaId: string) => {
      const copia = await (await obterRepositorioProgramas()).duplicar(programaId);
      await refetch();
      return copia;
    },
    [refetch],
  );

  return { programas, carregando, erro, duplicar, salvar, refetch };
}
