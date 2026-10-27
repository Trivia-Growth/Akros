import { obterArquivoDownloadReal } from "@/app/real-repositories";
import { useCallback, useState } from "react";

export function useDownloadDocumento() {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState(false);

  const baixar = useCallback(async (versaoId: string, nome: string) => {
    setBaixando(true);
    setErro(false);
    try {
      const arquivo = await obterArquivoDownloadReal().baixar(versaoId);
      const url = URL.createObjectURL(arquivo);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = nome;
        link.click();
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      setErro(true);
    } finally {
      setBaixando(false);
    }
  }, []);
  return { baixar, baixando, erro };
}
