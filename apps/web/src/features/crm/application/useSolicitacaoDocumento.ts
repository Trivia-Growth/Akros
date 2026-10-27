import { obterCasoComandosReal, obterRepositorioProgramas } from "@/app/real-repositories";
import type { Jornada } from "@/features/jornada/domain/types";
import type { Programa } from "@/features/programas/domain/types";
import { useCallback, useEffect, useRef, useState } from "react";

type Dados = {
  faseId: string;
  requisitoId: string;
  titulo: string;
  prazoEm?: string;
  instrucao?: string;
} & (
  | { sujeitoTipo: "caso" }
  | { sujeitoTipo: "participante"; sujeitoParticipanteId: string }
  | { sujeitoTipo: "familiar"; sujeitoFamiliarId: string }
);

export function useSolicitacaoDocumento(clienteId: string, jornada: Jornada) {
  const [programa, setPrograma] = useState<Programa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const tentativa = useRef<{ dados: string; chave: string } | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    setPrograma(null);
    void (async () => {
      try {
        const repo = await obterRepositorioProgramas();
        const lista = await repo.listar(false);
        const encontrados = lista.filter(
          (p) => p.codigo === jornada.programaId && p.versao === jornada.programaVersao,
        );
        if (encontrados.length !== 1) throw new Error("programa não encontrado");
        if (ativo) setPrograma(encontrados[0]);
      } catch {
        if (ativo) setErro("case.requestProgramError");
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [jornada.programaId, jornada.programaVersao]);

  const solicitar = useCallback(
    async (dados: Dados): Promise<boolean> => {
      setErro(null);
      setSalvando(true);
      try {
        const conteudo = JSON.stringify({ clienteId, ...dados });
        if (tentativa.current?.dados !== conteudo)
          tentativa.current = { dados: conteudo, chave: crypto.randomUUID() };
        await obterCasoComandosReal().solicitarDocumento({
          clienteId,
          ...dados,
          idempotencyKey: tentativa.current.chave,
        });
        tentativa.current = null;
        return true;
      } catch {
        setErro("case.requestError");
        return false;
      } finally {
        setSalvando(false);
      }
    },
    [clienteId],
  );
  return { programa, carregando, salvando, erro, solicitar };
}
