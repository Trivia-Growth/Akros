---
name: DESIGN
description: Editor de etapas do programa (CRUD de RequisitoDocumento) e extensão da porta de análise de IA com skill + arquivo de referência por etapa.
story: E06-S05
alwaysApply: false
---

# DESIGN — Editor de etapas com análise de documento por IA (E06-S05)

Tier **arquitetural**: abre escrita num contexto que o ADR-0004 registrou como só-leitura, e
estende o contrato do ADR-0005 (`AnalisadorDocumentoPort`). **Requer aprovação do `@architect` e
um ADR que ateste a mudança antes de implementar** — ADRs não se editam; este story precisa de um
novo ADR (sugestão: ADR-0013) que referencia e restringe o escopo do ADR-0004 (a cláusula "sem
editor no admin" deixa de valer só para `RequisitoDocumento`; o resto do Programa continua
imutável pela UI nesta rodada).

## Escopo da escrita: só `RequisitoDocumento`

Não é um editor de `Programa` inteiro. O admin cadastra/edita/remove itens de
`documentosExigidos` (E06-S01) dentro de uma fase existente — não cria fase, não cria programa,
não muda `sujeito`/`categoria`/`versao`. Isso mantém o blast radius pequeno e não reabre a
pergunta de versionamento (`programaVersao` continua congelado por caso, ADR-0004).

## Modelo — extensão de `features/programas/domain/types.ts`

```ts
export interface AnaliseIAConfig {
  habilitada: boolean;
  skill: string;                 // instrução específica de como validar este requisito
  arquivoReferenciaId?: string;  // aponta para ArquivoReferencia — ver abaixo
}

export interface RequisitoDocumento {
  id: string;
  faseTemplateId: string;
  tipo: TipoDocumento;
  titulo: string;
  objetivo: string;
  obrigatorio: boolean;
  emitidoPor: "cliente" | "empregador" | "instituicao" | "terceiro_certificado";
  aceitaSubstituto?: string[];
  analiseIA?: AnaliseIAConfig;    // novo — ausente/habilitada:false = comportamento atual
}

export interface ArquivoReferencia {
  id: string;
  requisitoId: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  enviadoEm: string;
  // conteúdo binário não persiste em banco nesta fase — mesma regra do upload de documento
  // do cliente (E02-S03): metadados no store mock, sem storage real.
}
```

`skill` é texto livre (chave i18n não se aplica — é conteúdo de configuração do admin, não copy de
produto; mesma exceção documentada de `programas` para conteúdo de fase, ver SPEC_DEVIATION da
rodada 2).

## Porta — `features/programas/application/ports.ts`

```ts
export interface RequisitoDocumentoRepository {
  listarPorPrograma(programaId: string): Promise<RequisitoDocumento[]>;
  criar(input: Omit<RequisitoDocumento, "id">): Promise<RequisitoDocumento>;
  atualizar(id: string, input: Partial<RequisitoDocumento>): Promise<RequisitoDocumento>;
  remover(id: string): Promise<void>;
  salvarArquivoReferencia(requisitoId: string, arquivo: File): Promise<ArquivoReferencia>;
}
```

Adapter desta fase: `MockRequisitoDocumentoRepository`, escrevendo no mesmo `useMockDb` que já
guarda `programas`. Remover um requisito com documentos de cliente já existentes é bloqueado (ver
AC-6) — não silenciosamente cascade-deleta o histórico de um cliente.

## Extensão da porta de análise — `features/documentos/application/ports.ts` (E07-S01)

```ts
export interface AnalisadorDocumentoPort {
  analisar(input: {
    documentoId: string;
    tipoEsperado: TipoDocumento;
    objetivoRequisito: string;
    skillAnalise?: string;          // novo — de RequisitoDocumento.analiseIA.skill
    arquivoReferenciaId?: string;   // novo
  }): Promise<AnaliseDocumento>;
}
```

O use case que monta esse input (hoje em `documentos/application`) passa a ler
`requisito.analiseIA` quando presente. Sem mudança de contrato para requisitos que não habilitam
IA — `skillAnalise`/`arquivoReferenciaId` chegam `undefined`, comportamento idêntico ao E07-S01.

### `MockAnalisadorDocumento` nesta rodada

Não chama LLM (seguindo o mesmo adapter mockado do E07-S01). Quando `skillAnalise` está presente,
o mock passa a **citar** a skill e a referência no parecer (`sugestoes`, `lacunas`) das fixtures
correspondentes, para o admin ver na demo que a configuração está sendo lida — mas o "defeito"
continua vindo da fixture do documento, não de uma comparação real de conteúdo. A comparação real
contra o arquivo de referência é trabalho do adapter LLM (fora desta rodada, mesma nota do
E07-S01: PII pesado, precisa de decisão de redaction/retenção antes de mandar conteúdo pra fora).

## Máquina de estados — sem mudança

Reaproveita a máquina do E07-S01 (`enviado → em_analise → aprovado/ajustes`, sempre por ação
humana). Skill e arquivo de referência influenciam o **parecer**, nunca o `Documento.status`. O
AC mais importante desta story é justamente provar que essa invariante sobrevive à configuração
nova — mesma classe de teste do E07-S01 AC-3.

## UI

Novo formulário em `/admin/programas/:programaId/requisitos/:id` (ou modal a partir do detalhe do
E06-S04): campos do requisito + seção condicional "Análise por IA" (toggle → textarea de skill +
upload de arquivo de referência, só renderizada quando o toggle está ligado).

## Cobertura dos 5 eixos

### 1. Tech stack
Nada novo. Reaproveita upload mock já usado em E02-S03 (documento do cliente) para o arquivo de
referência do admin.

### 2. Arquitetura base
Abre a primeira escrita em `programas` desde o ADR-0004, escopada a um sub-tipo. Estende o
contrato do E07-S01 sem quebrar consumidores existentes (campos novos são opcionais).

### 3. Infra
Sem migration real (protótipo mockado) — `useMockDb` ganha ações `criarRequisito`,
`atualizarRequisito`, `removerRequisito`, `salvarArquivoReferencia`.

### 4. Qualidade
- Unidade: `RequisitoDocumento` sem `analiseIA` continua analisando igual ao E07-S01 (regressão).
- Unidade: requisito com `analiseIA.habilitada = true` e sem `skill` preenchida é bloqueado na
  validação do formulário (AC-3).
- Integração: parecer da IA muda de conteúdo (sugestões) quando a skill é preenchida, sem nunca
  mudar `Documento.status` sozinho (AC-4, replica o AC-3 do E07-S01 com a config nova ligada).

### 5. Observabilidade
Sem métrica nova nesta rodada. Fica registrado como pendência: quando o adapter LLM real existir,
custo por análise deve diferenciar requisitos com skill customizada (prompt maior).

## Riscos

| Risco | Prob. × Impacto | Mitigação |
|---|---|---|
| Reabrir a superfície "editor de programa" além do escopo combinado (fase, versão, programa) | média × alto | AC explícito limitando a escrita a `RequisitoDocumento`; revisão de PR checa que nenhuma tela nova edita `Programa.versao`/`sujeito`/`categoria` |
| Admin remover requisito com documentos de cliente já anexados, perdendo rastreabilidade | média × alto | AC-6: remoção bloqueada se existir `Documento.requisitoId` apontando pra ele; oferecer "desativar" em vez de excluir |
| Skill mal escrita pelo admin gerar parecer confuso e o cliente confundir com decisão da Akros | média × médio | Mesma ressalva de confiança/limite do ADR-0005 continua visível; nenhuma mudança na regra de "nunca aprova sozinho" |
| Story avançar sem o ADR-0013 (ou substituto) formalizando a exceção ao ADR-0004 | alta × médio | Gate do `@architect`: não implementar sem o ADR novo aprovado — registrado no `spec.md` como pré-requisito |

## Questões em aberto
- [ ] Confirmar com o Bruno se "arquivar" é sinônimo de `aprovado` ou se precisa de status novo.
- [ ] Definir se o `arquivoReferencia` pode ser reaproveitado entre requisitos do mesmo tipo
  (`tipo: TipoDocumento`) para não pedir o mesmo modelo de carta em cada programa.
- [ ] `@architect` decide se este story nasce como `E06-S05` (dentro do épico Programas) ou vira
  `E07-S05` (dentro do épico IA de análise) — hoje aberto no lado dos dois épicos.
