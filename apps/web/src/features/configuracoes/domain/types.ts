export type CategoriaIntegracao = "mensageria" | "automacao" | "pagamentos" | "crm";

/** Configuração pública da integração. Segredos nunca são devolvidos ao front-end. */
export interface IntegracaoExterna {
  id: string;
  nome: string;
  fornecedor: string;
  categoria: CategoriaIntegracao;
  descricao: string;
  ativa: boolean;
  segredoConfigurado: boolean;
  segredoFinal?: string;
  atualizadoEm?: string;
}
