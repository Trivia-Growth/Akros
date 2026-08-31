/**
 * Sanitização do evento de erro antes de sair da máquina do usuário (E16-S01, AC-4).
 *
 * Duas camadas, porque uma só não basta:
 *
 * 1. **Lista de permissão de campos.** O payload é montado campo a campo, nunca por spread de um
 *    objeto de erro. Lista de bloqueio esquece o campo novo; lista de permissão não tem como.
 * 2. **Varredura do texto livre.** `message` e `stack` são escritos por quem lançou o erro e
 *    passam por interpolação — "cliente joao@x.com não encontrado" é PII dentro de um campo que a
 *    camada 1 aprova. A varredura é best-effort, e está documentada como tal: ela reduz o
 *    vazamento acidental, não substitui não colocar dado pessoal em mensagem de erro.
 */

const PADROES: Array<[RegExp, string]> = [
  [/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]"],
  // CPF com ou sem máscara.
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[documento]"],
  // Telefone BR com DDD, com ou sem +55 e máscara.
  [/(?:\+?55\s?)?\(?\d{2}\)?[\s-]?9?\d{4}[\s-]?\d{4}\b/g, "[telefone]"],
  // JWT (3 blocos base64url) e chaves longas — token nunca deve sair daqui.
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[token]"],
  [/\b(?:sb[a-z]?_|sk-|gho_|ghp_)[A-Za-z0-9_-]{16,}/g, "[token]"],
];

/** Best-effort: troca o que parece dado pessoal por um rótulo. Ver nota da camada 2 acima. */
export function limparTexto(texto: string, maxLen = 2000): string {
  let saida = texto.slice(0, maxLen);
  for (const [padrao, rotulo] of PADROES) saida = saida.replace(padrao, rotulo);
  return saida;
}

export interface EventoErro {
  mensagem: string;
  nome: string;
  stack?: string;
  /** Área da aplicação, vinda do ErrorBoundary — "o painel admin", "o portal". */
  area: string;
  /** Só o pathname. `search` e `hash` carregam id e token e ficam de fora por construção. */
  rota: string;
  /** Identificador pseudônimo do usuário. Não é PII direta e é o que torna o erro rastreável. */
  usuarioId?: string;
  papel?: string;
  userAgent: string;
  quando: string;
}

interface Entrada {
  erro: unknown;
  area: string;
  rota?: string;
  usuarioId?: string;
  papel?: string;
  userAgent?: string;
  agora?: () => Date;
}

/**
 * Monta o evento a partir de campos nomeados — nunca de spread. É o que garante que um campo novo
 * num objeto de erro não vaze sozinho.
 */
export function montarEvento({
  erro,
  area,
  rota,
  usuarioId,
  papel,
  userAgent = "",
  agora = () => new Date(),
}: Entrada): EventoErro {
  const e = erro instanceof Error ? erro : new Error(String(erro ?? "erro desconhecido"));
  return {
    mensagem: limparTexto(e.message, 500),
    nome: limparTexto(e.name, 100),
    stack: e.stack ? limparTexto(e.stack, 4000) : undefined,
    area: limparTexto(area, 100),
    // `pathname` puro: nem query, nem fragmento.
    rota: limparTexto((rota ?? "").split("?")[0].split("#")[0], 200),
    usuarioId,
    papel,
    userAgent: limparTexto(userAgent, 300),
    quando: agora().toISOString(),
  };
}
