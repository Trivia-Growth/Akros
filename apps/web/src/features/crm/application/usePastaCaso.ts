import { obterCasoComandosReal, obterVinculoPastaReal } from "@/app/real-repositories";
import { useIntegracaoOneDrive } from "@/features/configuracoes/application/useIntegracaoOneDrive";
import { useCallback, useEffect, useRef, useState } from "react";

export function usePastaCaso(clienteId: string, jornadaId: string) {
  const {
    integracao,
    carregando: carregandoIntegracao,
    erro: erroIntegracao,
  } = useIntegracaoOneDrive();
  const [vinculo, setVinculo] = useState<{ folderItemId: string; estado: string } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const tentativa = useRef<{ folderItemId: string; chave: string } | null>(null);

  const consultar = useCallback(async () => {
    setCarregando(true);
    try {
      setVinculo(await obterVinculoPastaReal().carregar(clienteId, jornadaId));
      setErro(null);
    } catch {
      setErro("case.folderReadError");
    } finally {
      setCarregando(false);
    }
  }, [clienteId, jornadaId]);
  useEffect(() => {
    tentativa.current = null;
    void consultar();
  }, [consultar]);

  const vincular = useCallback(
    async (folderItemId: string) => {
      if (!integracao || integracao.estado !== "conectada") return;
      setErro(null);
      setSalvando(true);
      try {
        if (tentativa.current?.folderItemId !== folderItemId) {
          tentativa.current = { folderItemId, chave: crypto.randomUUID() };
        }
        await obterCasoComandosReal().vincularPasta({
          clienteId,
          jornadaId,
          integracaoId: integracao.id,
          folderItemId,
          idempotencyKey: tentativa.current.chave,
        });
        await consultar();
      } catch {
        setErro("case.folderLinkError");
      } finally {
        setSalvando(false);
      }
    },
    [clienteId, jornadaId, integracao, consultar],
  );
  return {
    vinculo,
    carregando: carregando || carregandoIntegracao,
    salvando,
    erro: erroIntegracao ? "case.folderReadError" : erro,
    conectada: integracao?.estado === "conectada",
    vincular,
  };
}
