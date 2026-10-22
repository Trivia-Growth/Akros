// E03-S07 Fase 5 (T058, ADR-0019) — leitura da conexão Microsoft/OneDrive para o cartão "Conta
// Microsoft / OneDrive". Mesmo formato de `useParticipantesConsulta.ts`
// (carregando/erro/refetch), chamando `obterConsultaIntegracaoOneDriveReal()` de
// `@/app/real-repositories` direto (sem variante Mock, mesmo critério já usado pelas demais
// consultas reais desta feature).
import { obterConsultaIntegracaoOneDriveReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { IntegracaoOneDrive } from "../domain/types";

export function useIntegracaoOneDrive() {
  const [integracao, setIntegracao] = useState<IntegracaoOneDrive | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setIntegracao(await obterConsultaIntegracaoOneDriveReal().carregar());
    } catch (causa) {
      setErro(
        causa instanceof Error
          ? causa
          : new Error("Não foi possível carregar a conexão com o OneDrive."),
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { integracao, carregando, erro, refetch };
}
