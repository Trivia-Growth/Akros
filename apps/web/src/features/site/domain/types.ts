export interface PostBlog {
  id: string;
  slug: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  categoria: string;
  publicadoEm: string;
}

export interface Depoimento {
  id: string;
  nomeCliente: string;
  tipoVisto: string;
  texto: string;
}
