---
name: DESIGN
description: Schemas documentos e pagamentos — terceira/quarta réplica do padrão de E13-S01.
story: E13-S03
alwaysApply: false
---

# design.md — E13-S03 Schema `documentos` + `pagamentos`

Mecanismo (RLS via claim do JWT + `crm.meu_cliente_id()`, convenção de migration) já fechado em
E13-S01/S02. Só o que é novo aqui:

## `documentos`

- `analise` (parecer da IA, ADR-0005) e `metadados_fixture` (campo só-fixture) viram **JSONB** —
  mesmo critério de `perfil_imigratorio`: bloco lido/escrito inteiro pela UI, nunca filtrado por
  subcampo (`lacunas[].gravidade` não aparece em nenhum WHERE hoje).
- `fase_id` é FK **cross-schema** pra `jornada.fases(id)` — Postgres permite FK entre schemas do
  mesmo banco sem nada especial, só qualificar `jornada.fases`.
- `solicitacoes_assinatura` é tabela própria (1:1 com documento) — já era entidade separada no
  domínio (`SolicitacaoAssinatura`), não motivo pra juntar.

## `pagamentos`

- `pagamentos.pagamentos` — flat, sem JSONB (nenhum campo aninhado no domínio).
- `pagamentos.dados_recebimento` é **diferente de todo o resto até agora**: não pertence a um
  cliente (é a instrução bancária **fictícia** da própria Akros, `docs/epics/ROADMAP.md` pergunta
  aberta nº 8 — dado real entra por decisão consciente antes de produção). RLS aqui não é
  "papel + cliente_id", é "qualquer autenticado lê, só admin escreve": todo cliente precisa ver
  como pagar, ninguém client-side deveria poder alterar a conta de destino.

## RLS de `pagamentos.dados_recebimento`

```sql
CREATE POLICY "qualquer_autenticado_le" ON pagamentos.dados_recebimento
  FOR SELECT USING (true);

CREATE POLICY "so_admin_escreve" ON pagamentos.dados_recebimento
  FOR UPDATE USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');
```

Sem policy de INSERT/DELETE pra ninguém autenticado — as 2 linhas (BRL/USD) nascem via seed/
`service_role`, não por fluxo de usuário.

## Fora de escopo

Igual às anteriores: sem troca de adapter (E13-S07); seed mínimo; `audit`/`lgpd` (E13-S05/S06).
