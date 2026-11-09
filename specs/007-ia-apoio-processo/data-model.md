# Data Model: IA de apoio ao processo (E07-S05)

Schema `documentos` (já existe, E13-S03/E03-S07). Convenção de nome de migration:
`NNNN_E07-S05_<descricao>.sql`, próximo número sequencial depois da última migration aplicada.

## Entidades novas

### `documentos.pre_analises`

Resultado da checagem local de legibilidade/qualidade (US1) — nunca envolve rede externa.

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid pk | |
| `versao_id` | uuid not null, FK `arquivos.versoes` | uma pré-análise por versão (unique) |
| `pagina_completa` | boolean not null | FR-002 |
| `resolucao_suficiente` | boolean not null | FR-002 |
| `tipo_conteudo` | text not null, check in `('texto_pesquisavel','imagem_escaneada')` | FR-002 |
| `motivo_problema` | text | obrigatório quando `pagina_completa = false` OU `resolucao_suficiente = false` (CHECK) |
| `calculado_em` | timestamptz not null default now() | |

RLS: mesma visibilidade por papel de `documentos.documentos` (join por `versao_id →
documento_id`) — participante vê a pré-análise do próprio documento, admin vê todas.

### `documentos.rascunhos_resposta`

Rascunho de resposta ao cliente (US3) — nunca enviado automaticamente (FR-009).

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid pk | |
| `documento_id` | uuid not null, FK `documentos.documentos` | |
| `texto` | text not null | editável pela equipe antes do envio (envio é FORA de escopo desta story — campo de estado "enviado" não existe aqui de propósito) |
| `prazo_resposta_dias_uteis_usado` | integer not null | snapshot do contrato no momento da geração — FR-008; nunca recalculado silenciosamente se o contrato mudar depois |
| `prioridade_usada` | text not null, check in `('padrao','prioritaria')` | idem |
| `gerado_em` | timestamptz not null default now() | |
| `editado_por` | uuid | preenchido quando a equipe salva uma edição |
| `editado_em` | timestamptz | |

RLS: admin-only (SELECT/INSERT/UPDATE) — rascunho não é dado do cliente, é ferramenta de
trabalho da equipe; cliente nunca lê o rascunho (só a resposta final, que sai por canal já
existente — comunicação, E08).

### `documentos.chamadas_ia`

Auditoria append-only de toda chamada a provedor externo (research.md item 8). Nunca guarda o
conteúdo enviado.

| Campo | Tipo | Regra |
|---|---|---|
| `id` | uuid pk | |
| `versao_id` | uuid not null, FK `arquivos.versoes` | |
| `provedor` | text not null | nome do provedor dedicado (confirmado em ADR) |
| `finalidade` | text not null, check in `('cruzamento_requisito','rascunho_resposta')` | |
| `enviado_em` | timestamptz not null default now() | |
| `enviado_por_processo` | text not null | identifica qual job/função disparou (auditoria técnica, não autor humano) |

RLS/GRANT: admin-only SELECT; **sem UPDATE/DELETE para ninguém** (append-only, mesmo padrão de
`audit.eventos`/0008) — `service_role` grava via `INSERT` dentro do job, nunca por `.from().insert()`
solto fora de um comando transacional.

### `crm.clientes.ia_apoio_ativa` (coluna nova, não tabela nova)

| Campo | Tipo | Regra |
|---|---|---|
| `ia_apoio_ativa` | boolean not null default **true** | FR-010 — default ligado; equipe desliga por caso quando quiser. Default `true` documentado como decisão de produto a confirmar com a Akros antes do rollout (pode inverter para opt-in por caso se a operação preferir) |

RLS: já cobertas pelas policies existentes de `crm.clientes`; só admin escreve.

## Extensão de entidade existente

### `documentos.documentos.analise` (jsonb, já existe)

Continua sendo o parecer de cruzamento (US2) — **sem migration de schema**, só muda quem escreve:
o adapter real grava o mesmo formato de `AnaliseDocumento` que o mock já produz hoje
(`aderencia`, `confianca`, `lacunas[]`, `sugestoes[]`, `analisadoEm`, `motor`), com `motor`
identificando o provedor real em vez de `"mock-regras@1"`. Quando não há texto extraído com
confiança suficiente (US2 AC-2), `analise` grava `aderencia: null`-equivalente já suportado pelo
tipo (ver FR-012) — reaproveita o "sem parecer" que a UI já trata.

## Relações

```
arquivos.versoes (1) ──── (0..1) documentos.pre_analises
arquivos.versoes (1) ──── (0..n) documentos.chamadas_ia
documentos.documentos (1) ──── (0..n) documentos.rascunhos_resposta
documentos.documentos (1) ──── (1) analise (jsonb, inalterado)
crm.clientes (1) ──── (1) ia_apoio_ativa (coluna)
```

## Transições de estado

```
pre_analise:   (não existe) → calculada           (uma vez por versão; nunca recalculada)
parecer (US2): ausente → gerado | indisponível     (indisponível quando sem texto confiável — FR-012)
rascunho:      gerado → editado                    (nunca "enviado" nesta story — FR-009)
ia_apoio_ativa: true ⇄ false                        (toggle livre pelo admin, a qualquer momento)
```
