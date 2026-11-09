// _shared/corpo.ts — leitura de corpo com teto de bytes que vale SEM `content-length` (AV-07).
//
// `content-length` é declaração do cliente: em transferência chunked ele não existe, e checar só
// ele deixa `await req.arrayBuffer()` materializar o corpo inteiro ANTES de qualquer recusa. Aqui o
// stream é lido em blocos e cortado no primeiro byte que passa do teto — a memória gasta é a do
// teto mais um bloco, não a do corpo que o atacante quiser mandar.

/** Lê no máximo `limite` bytes; `null` se o corpo (declarado ou real) passar disso. */
export async function lerCorpoComLimite(req: Request, limite: number): Promise<Uint8Array | null> {
  const declarado = req.headers.get("content-length");
  // Declaração inválida ou já acima do teto: recusa sem ler nada.
  if (declarado !== null && (!/^\d+$/.test(declarado) || Number(declarado) > limite)) return null;
  if (!req.body) return new Uint8Array(0);

  const leitor = req.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.byteLength;
      if (total > limite) {
        await leitor.cancel().catch(() => {}); // solta o resto do upload
        return null;
      }
      partes.push(value);
    }
  } finally {
    leitor.releaseLock();
  }

  const corpo = new Uint8Array(total);
  let posicao = 0;
  for (const parte of partes) {
    corpo.set(parte, posicao);
    posicao += parte.byteLength;
  }
  return corpo;
}

/** Igual a `lerCorpoComLimite`, decodificado como UTF-8. `null` = passou do teto. */
export async function lerTextoComLimite(req: Request, limite: number): Promise<string | null> {
  const corpo = await lerCorpoComLimite(req, limite);
  return corpo === null ? null : new TextDecoder().decode(corpo);
}
