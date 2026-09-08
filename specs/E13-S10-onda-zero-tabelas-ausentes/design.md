---
name: DESIGN
description: Modelo relacional e perímetro de dados para propostas e configurações — E13-S10.
story: E13-S10
alwaysApply: false
---

# design.md — E13-S10 Onda 0: tabelas ausentes

## Decisão

`crm.propostas` fica no contexto CRM. `configuracoes.*` inaugura schema próprio para dados internos
de operação. Todos os dados desta story são admin-only: portal não tem fluxo de proposta aceito e
contas/integracões são configuração operacional. Uma policy futura de leitura de proposta no portal
será uma story explícita, não uma abertura incidental de RLS.

```
crm.leads     ────────< crm.propostas >──────── crm.clientes
                               (XOR)

configuracoes.equipe ──< contas_agenda ──< contas_agenda_compartilhamentos
configuracoes.integracoes
configuracoes.contas_canal
```

## Modelo

| Tabela | Núcleo | Relações e invariantes |
|---|---|---|
| `crm.propostas` | escopo, itens JSONB, visto, valor/moeda, condições, validade, status | `lead_id XOR cliente_id`; ambos FKs; itens é array JSONB |
| `configuracoes.equipe` | nome, cargo, avatar | fonte de dono/compartilhamento |
| `configuracoes.integracoes` | código, fornecedor, categoria, descrição, ativa, flags de configuração | código único; metadados públicos em JSONB |
| `configuracoes.contas_agenda` | provedor, nome, escopos, dono, e-mail/pasta | dono FK; escopos restritos a agenda/email/arquivos |
| `configuracoes.contas_agenda_compartilhamentos` | conta, membro | PK composta evita o mesmo compartilhamento duas vezes; UUID técnico único permite o trigger de auditoria genérico |
| `configuracoes.contas_canal` | provedor, nome, identificador, ativa | provedor em enum lógico por `CHECK` |

Todas recebem `id uuid`, timestamps, `created_by`, `updated_by` e `deleted_at` quando são entidade
de negócio. A tabela de compartilhamento é relação pura e não precisa soft delete: remover acesso
é materialmente diferente de apagar dado histórico; sua mudança já fica no `audit.*`.

## Segredos

O domínio atual mistura metadado de configuração com valores fictícios de secret. Esta migration
separa os dois: `segredo_configurado` e JSONB `metadados_publicos` podem registrar presença e IDs
públicos; nunca valor de secret. `credenciais_meta`, OAuth e webhook serão modelados com Supabase
Vault em E14-S02 antes do primeiro adapter que leia/escreva credencial real.

## RLS e auditoria

Cada tabela recebe `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, `GRANT USAGE` do schema
e `GRANT SELECT, INSERT, UPDATE` a `authenticated`. Policies repetem regra admin de E13-S09:
`auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`. Não há `DELETE`: desativação/soft delete
preserva trilha. Cada entidade, inclusive compartilhamento, dispara `audit.registrar_mudanca`.

## Sem seed de mocks

Seeds atuais têm IDs string e valores deliberadamente fictícios. Copiá-los daria aparência de
produção a dado que não é. A migration cria apenas estrutura. E13-S11 decide dados iniciais junto
do adapter e da tela que os consome, usando UUIDs reais de ponta a ponta.

## Fora de escopo

- Adapter Supabase, hooks e troca de `useMockDb`.
- Vault/OAuth, rotação e conexão externa.
- Reparent de propostas e eventos quando um lead vira cliente; depende da onda ancorada de E13-S11.
