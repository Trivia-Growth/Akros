---
name: DESIGN
description: Schema comunicacao — sexta réplica, com um caso novo (tabela admin-only, zero acesso de cliente).
story: E13-S05
alwaysApply: false
---

# design.md — E13-S05 Schema `comunicacao`

Mecanismo já fechado em E13-S01..S04. O que é novo:

## Mensagens/threads viram JSONB, ao contrário de `jornada.etapas`
`Conversa.mensagens[]` e `EmailThread.mensagens[]` são lidas/escritas como bloco (a tela abre a
thread inteira) e **não são consultadas através de conversas diferentes** — não existe "painel
de todas as mensagens que contêm X" cruzando clientes, ao contrário de `jornada.etapas` (painel de
gargalos). Critério do ADR-0010 aponta pra JSONB aqui, não tabela própria.

## `eventos` (timeline unificada, ADR-0006) — `cliente_id` fica nullable
`EventoComunicacao.clienteOuLeadId` aponta tanto pra cliente quanto pra lead (que ainda não tem
schema — `crm.leads` não existe, fora de escopo até uma story própria). `cliente_id` fica
`REFERENCES crm.clientes(id)`, **nullable**: evento de lead nasce com `cliente_id NULL` e fica
invisível pra qualquer papel `cliente` (correto — lead não tem portal, não é vazamento) até o dia
em que a conversão de lead→cliente popular a coluna.

## Caso novo: tabela **admin-only**, zero policy de cliente
`regras_atendimento_ia` (config do agente de IA) e `fontes_conhecimento` (catálogo de base de
conhecimento) não são dado de cliente **nenhum** — nenhum cliente jamais lê a própria configuração
de agente. Diferente de `programas`/`dados_recebimento` (todo autenticado lê), aqui só existe
policy pra `admin`. Um `cliente` autenticado que consultar essas tabelas recebe array vazio — sem
erro, porque o `GRANT SELECT` existe (senão a mensagem de erro vazaria "essa tabela existe"), só
não há policy que libere nenhuma linha pra ele.

## Fora de escopo
`crm.leads` (schema de lead — não existe, story própria se vier a ser necessária).
`audit`/`lgpd` — E13-S06/S07.
