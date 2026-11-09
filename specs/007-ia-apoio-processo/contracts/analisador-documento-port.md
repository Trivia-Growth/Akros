# Contrato: `AnalisadorDocumentoPort` (estendida)

Porta existente em `apps/web/src/features/documentos/application/ports.ts`. Esta story acrescenta
dois métodos; o método `analisar` já existente não muda de assinatura.

```ts
export interface AnalisadorDocumentoPort {
  // já existe — sem mudança de assinatura
  analisar(input: {
    documentoId: string;
    tipoEsperado: TipoDocumento;
    objetivoRequisito: string;
    skillAnalise?: string;
    arquivoReferenciaId?: string;
  }): Promise<AnaliseDocumento>;

  // novo — US1, nunca chama rede externa
  obterPreAnalise(versaoId: string): Promise<PreAnaliseDocumento | null>;

  // novo — US3, depende de `analisar` já ter produzido um parecer
  rascunharResposta(input: {
    documentoId: string;
    pareceCom: AnaliseDocumento; // reusa o parecer já calculado, não recalcula
  }): Promise<RascunhoResposta>;
}

export interface PreAnaliseDocumento {
  versaoId: string;
  paginaCompleta: boolean;
  resolucaoSuficiente: boolean;
  tipoConteudo: "texto_pesquisavel" | "imagem_escaneada";
  motivoProblema?: string;
  calculadoEm: string;
}

export interface RascunhoResposta {
  id: string;
  documentoId: string;
  texto: string;
  prazoRespostaDiasUteisUsado: number;
  prioridadeUsada: "padrao" | "prioritaria";
  geradoEm: string;
}
```

**Erros**: `analisar`/`rascunharResposta` **nunca lançam** quando o provedor externo está
indisponível — devolvem um resultado com `aderencia`/`texto` ausente e motivo explícito
("parecer indisponível", FR-011/FR-012), para a UI distinguir "sem parecer" de "erro de rede"
sem travar a revisão humana.

**Quem implementa**: `SupabaseAnalisadorDocumentoReal` (fora do modo demo) e
`MockAnalisadorDocumento` (demo, intocado — `obterPreAnalise` devolve fixture determinística,
`rascunharResposta` devolve texto fixo).
