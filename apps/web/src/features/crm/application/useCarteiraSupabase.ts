import { obterConsultaCarteiraReal } from "@/app/real-repositories";
import { useCallback, useEffect, useState } from "react";
import type { CursorCarteira, FiltrosCarteira, ItemCarteira, TotaisCarteira } from "./ports";

const TOTAIS_VAZIOS: TotaisCarteira = {
  total: 0,
  aguardandoCliente: 0,
  aguardandoAkros: 0,
  financeiroAtrasado: 0,
  cadastroIncompleto: 0,
};

/** E03-S07 (Fase 8/US5) — carteira inteira paginada por cursor. Trocar qualquer filtro reinicia a
 *  página; "carregar mais" acumula sobre os itens já exibidos. */
export function useCarteiraSupabase(filtros: FiltrosCarteira) {
  const [itens, setItens] = useState<ItemCarteira[]>([]);
  const [totais, setTotais] = useState<TotaisCarteira>(TOTAIS_VAZIOS);
  const [cursor, setCursor] = useState<CursorCarteira | null>(null);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<Error | null>(null);

  // Chave estável por conteúdo (não por referência) — evita recarregar quando o chamador passa
  // um objeto `filtros` novo a cada render com os mesmos valores.
  const chaveFiltros = JSON.stringify(filtros);

  useEffect(() => {
    const filtrosAtuais = JSON.parse(chaveFiltros) as FiltrosCarteira;
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    obterConsultaCarteiraReal()
      .buscar(filtrosAtuais, null)
      .then((resultado) => {
        if (cancelado) return;
        setItens(resultado.itens);
        setTotais(resultado.totais);
        setCursor(resultado.proximoCursor);
        setTemMais(resultado.proximoCursor !== null);
      })
      .catch((causa) => {
        if (cancelado) return;
        setErro(
          causa instanceof Error ? causa : new Error("Não foi possível carregar a carteira."),
        );
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [chaveFiltros]);

  const carregarMais = useCallback(async () => {
    if (!cursor || carregandoMais) return;
    setCarregandoMais(true);
    try {
      const resultado = await obterConsultaCarteiraReal().buscar(
        JSON.parse(chaveFiltros) as FiltrosCarteira,
        cursor,
      );
      setItens((atual) => [...atual, ...resultado.itens]);
      setCursor(resultado.proximoCursor);
      setTemMais(resultado.proximoCursor !== null);
    } catch (causa) {
      setErro(causa instanceof Error ? causa : new Error("Não foi possível carregar mais casos."));
    } finally {
      setCarregandoMais(false);
    }
  }, [cursor, carregandoMais, chaveFiltros]);

  return { itens, totais, temMais, carregando, carregandoMais, erro, carregarMais };
}
