---
name: DESIGN
description: Porta de análise de documento por IA — tipos, contrato, estados e separação entre parecer e decisão.
story: E07-S01
alwaysApply: false
---

# DESIGN — Porta de análise de documento por IA (E07-S01)

Tier **arquitetural** (ADR-0005). Define o contrato que E07-S02..S04 consomem.

## Princípio que governa o desenho
**Parecer e decisão são coisas separadas e o modelo de dados precisa impedir que se confundam.**
A IA escreve em `Documento.analise`. Só um humano escreve em `Documento.status`.

## Tipos — `features/documentos/domain/types.ts`

```ts
export type TipoDocumento =
  | "carta_experiencia"
  | "carta_recomendacao"
  | "diploma"
  | "historico_escolar"
  | "avaliacao_educacional"
  | "curriculo"
  | "passaporte"
  | "certidao"
  | "business_plan"
  | "estatuto_instituicao"
  | "comprovante_isencao_fiscal"
  | "extrato_bancario"
  | "demonstrativo_financeiro"
  | "traducao_certificada"
  | "outro";

export type Aderencia = "atende" | "atende_com_ressalva" | "nao_atende" | "tipo_incorreto";

export type GravidadeLacuna = "impeditiva" | "recomendada";

export interface Lacuna {
  id: string;
  gravidade: GravidadeLacuna;
  descricao: string;      // chave i18n — "falta assinatura do emissor"
}

export interface AnaliseDocumento {
  documentoId: string;
  tipoDetectado: TipoDocumento;
  tipoEsperado: TipoDocumento;
  aderencia: Aderencia;
  confianca: number;      // 0..1, sempre exibido
  lacunas: Lacuna[];
  sugestoes: string[];    // chaves i18n, linguagem de cliente
  analisadoEm: string;
  motor: string;          // "mock-regras@1" | "llm-<modelo>" — rastreabilidade
}
```

`Documento` ganha dois campos e **nenhum** dos existentes muda de significado:

```ts
interface Documento {
  // ...campos atuais
  requisitoId?: string;        // ligação com o catálogo do programa (E06)
  analise?: AnaliseDocumento;  // parecer da IA — nunca decide status
}
```

## Porta — `features/documentos/application/ports.ts`

```ts
export interface AnalisadorDocumentoPort {
  analisar(input: {
    documentoId: string;
    tipoEsperado: TipoDocumento;
    objetivoRequisito: string;
  }): Promise<AnaliseDocumento>;
}
```

## Adapter desta fase — `MockAnalisadorDocumento`

Regras determinísticas sobre as fixtures, não aleatoriedade. Cada documento de mock declara o
"defeito" que carrega, e o adapter devolve o parecer correspondente. Isso mantém a demo
**reproduzível** — o Bruno precisa poder repetir o mesmo cenário duas vezes.

Latência simulada de 2–4s, com estado de carregamento real na UI: a espera é parte da experiência
que está sendo demonstrada, e esconder isso mente sobre o produto.

## Máquina de estados

```
enviado ──analisar()──▶ em_analise
                            │
                 ┌──────────┴───────────┐
        analise.aderencia               │
        "nao_atende"/"tipo_incorreto"   "atende"/"atende_com_ressalva"
                 │                      │
        cliente corrige e reenvia       fila de revisão humana (E07-S03)
                 │                      │
                 └──────────▶ enviado   ├── humano aprova ──▶ aprovado
                                        └── humano pede ajuste ──▶ ajustes
```

O documento **nunca** vai para `aprovado` sem passar por um humano — nem quando a IA está 99%
confiante. Essa é a decisão do ADR-0005, e é o AC mais importante do épico.

## Escape hatch obrigatório
O cliente sempre pode **enviar assim mesmo** contra o parecer da IA. O documento entra na fila
humana marcado como "enviado apesar do alerta". Sem isso, um falso negativo da IA vira um cliente
travado sem saída — e a IA não tem autoridade para travar ninguém.

## Futuro (fora desta rodada, registrado)
Adapter LLM: prompt e few-shots em `ia/`, custo por análise, e o ponto sensível — documento de
imigração é PII pesado (passaporte, extrato, endereço). Antes de mandar conteúdo para um provedor
externo: registro em `docs/SECURITY_DEBT.md`, decisão sobre redaction e sobre retenção.
