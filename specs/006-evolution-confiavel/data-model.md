# Data Model: Evolution confiável (E13-S15)

Migration: `supabase/migrations/0039_E13-S15_evolution_confiavel.sql` (aditiva; rollback no cabeçalho).

## `configuracoes.evolution_servidor` (nova, uma linha)

| Coluna | Tipo | Regra |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| url_base | text NOT NULL | sem barra final; HTTPS validado na função (CHECK `^https://`) |
| versao_detectada | text | |
| estado | text NOT NULL | `pendente` \| `compativel` \| `incompativel` |
| motivo | text | motivo do `incompativel` |
| indicio | text | ≤ 4 caracteres (CHECK) |
| atualizado_por | uuid | |
| created_at / updated_at | timestamptz | |

Single-tenant: índice único `((true))` garante **uma** linha. A chave global fica no Vault, escopo
`evolution-servidor:<id>`. RLS FORCE; `SELECT` só admin; escrita só `service_role`; trigger de auditoria.

## `configuracoes.evolution_compatibilidade` (nova)

| Coluna | Tipo | Regra |
|---|---|---|
| id | uuid PK | exigido pelo gatilho de auditoria |
| versao | text UNIQUE NOT NULL | |
| capacidades | text[] NOT NULL | subconjunto de `instanceCreate, qr, connectionState, webhookHeaders, webhookEvents, sendText, deliveryStatus, deleteInstance` |
| afetada_logout | boolean NOT NULL DEFAULT false | versão em que logout para o recebimento |
| evidencia | text NOT NULL | resumo do smoke (data, quem rodou); sem segredo |
| registrada_por | uuid | |
| created_at / updated_at | timestamptz | |

Versão **compatível** = existe linha com as 7 capacidades obrigatórias. RLS FORCE; `SELECT` admin;
escrita `service_role`; auditoria. Sem seed.

## `configuracoes.contas_canal` (alterada)

| Coluna nova | Tipo | Regra |
|---|---|---|
| estado_conexao | text NOT NULL DEFAULT `sem_credencial` | CHECK em `sem_credencial, configuracao_incompleta, aguardando_pareamento, conectado_verificado, desconectado, erro` |
| ultimo_erro_codigo | text | código curto (sem corpo/segredo); CHECK `^[a-z0-9_]{1,60}$` |
| nome_instancia | text | único quando não nulo; `akros-<24 hex>` |
| aceite_risco_em / aceite_risco_por | timestamptz / uuid | aceite de banimento (Evolution) |

Contas existentes ficam `sem_credencial`. Para `provedor='evolution'`: `credenciais_configuradas=true`
só depois do webhook **confirmado**; o agente só responde com `ativa` **e**
`estado_conexao='conectado_verificado'`.

## `comunicacao.conversas` (alterada)

| Coluna nova | Tipo | Regra |
|---|---|---|
| identificacao | text NOT NULL DEFAULT `identificada` | CHECK `identificada` \| `nao_identificada` |

Conversa `nao_identificada`: `cliente_id` nulo, `contato_externo='lid:<dígitos>'`, `cliente_nome='Contato
não identificado'`. CHECK: `nao_identificada` ⇒ `cliente_id IS NULL`. Visibilidade já é só admin
(portal usa `cliente_id = crm.meu_cliente_id()`); coberto por teste SQL.

### Forma da mensagem (JSONB `mensagens[]`)

```json
{ "id": "<origemId>", "autor": "cliente", "texto": "legenda ou aviso", "enviadoEm": "ISO",
  "lida": false, "tipo": "texto|imagem|audio|arquivo|video",
  "midiaNome": "doc.pdf",
  "anexo": { "caminho": "<conta>/<origemId>", "mime": "application/pdf", "tamanhoBytes": 12345,
             "baixado": true, "motivo": "tamanho|tipo|download" } }
```

## Storage

Bucket privado `comunicacao-anexos` (limite de arquivo 15 MB, lista de MIME). Escrita só
`service_role`; leitura (`createSignedUrl`) só admin via policy em `storage.objects`
(`app_metadata.role='admin'`). Nenhuma policy para cliente.

## RPCs

| RPC | Papel | O que faz |
|---|---|---|
| `crm.obter_cliente_unico_por_telefone(p_telefone)` | service_role | devolve `(id, nome)` **só** se houver exatamente um cliente ativo com o telefone canônico |
| `comunicacao.registrar_entrada_canal(...)` (recriada) | service_role | + `p_tipo`, `p_anexo jsonb`, `p_identificacao`; texto vazio permitido quando `p_tipo<>'texto'`; mantém recibo único `(conta, origem)` e a trava da conversa; evento de timeline só com cliente |
| `comunicacao.concluir_entrada_canal(...)` | service_role | inalterada |

## `configuracoes.transcricao_audio` (nova, uma linha — migration `0040`, ADR-0022)

`id`, `ativa` (padrão `false`), `provedor` (`groq`\|`openrouter`), `modelo` (`^[A-Za-z0-9._/-]{1,80}$`),
`idioma` (ISO 639-1 ou nulo = automático), `indicio` (≤4), `aceite_envio_em`/`aceite_envio_por`,
`verificada_em`, auditoria. `CHECK (NOT ativa OR (aceite_envio_em IS NOT NULL AND verificada_em IS NOT
NULL))`: ligada exige as duas provas no próprio banco. Leitura só admin; escrita só `service_role`.
A chave **não** está aqui (Vault `transcricao:<id>`).

Marca na mensagem (JSONB `anexo.transcricao`, só em áudio): `{estado: concluida\|falhou, provedor?,
modelo?, motivo?}`; o texto transcrito é o próprio `texto` da mensagem.

## Vault (escopos)

`evolution-servidor:<uuid>` → `{apiKey}` · `evolution:<conta>` → `{webhookToken, instanceToken}`
(campo legado `apiKey` ignorado) · `transcricao:<uuid>` → `{apiKey}`. Regex de escopo ampliada em
`referencias_cofre` e `salvar_segredo_integracao` (mantém `microsoft-graph` e `upload-sessao` do OneDrive).

## Transições de `estado_conexao`

```text
sem_credencial ──instância criada──▶ configuracao_incompleta ──webhook relido OK──▶ aguardando_pareamento
aguardando_pareamento ──QR lido, número == canal──▶ conectado_verificado
conectado_verificado ──CONNECTION_UPDATE close / consulta falha / número mudou──▶ desconectado
desconectado ──QR novo lido, número == canal──▶ conectado_verificado
qualquer ──falha de etapa──▶ configuracao_incompleta (retomável) | erro (código)
```
