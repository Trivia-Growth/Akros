export interface IOManutencaoArquivos {
  liberarLeases(): Promise<void>;
  listarConfirmados(): Promise<Array<{ id: string; caminho: string }>>;
  removerObjeto(caminho: string): Promise<void>;
  marcarLimpo(id: string, caminho: string): Promise<void>;
}

export async function executarManutencaoArquivos(io: IOManutencaoArquivos): Promise<void> {
  await io.liberarLeases();
  let itens: Array<{ id: string; caminho: string }>;
  try {
    itens = await io.listarConfirmados();
  } catch {
    console.warn("falha ao consultar temporários confirmados; limpeza será repetida");
    return;
  }
  for (const item of itens) {
    try {
      await io.removerObjeto(item.caminho);
      await io.marcarLimpo(item.id, item.caminho);
    } catch {
      console.warn("falha ao limpar temporário confirmado; limpeza será repetida");
    }
  }
}
