---
name: DESIGN
description: audit.eventos append-only + trigger genérico, aplicado a todas as tabelas de negócio de E13-S01..S05.
story: E13-S06
alwaysApply: false
---

# design.md — E13-S06 `audit.*` append-only

`seguranca/os-grade.md`: *"`audit.*` append-only: policies negam UPDATE/DELETE para todos,
inclusive `service_role`."*

## Refinamento de mecanismo (não reabre a exigência, corrige o "como")

`service_role` no Supabase tem o atributo `BYPASSRLS` — **RLS não se aplica a ele por design**,
não importa quantas policies existam. "Policy nega UPDATE/DELETE pro `service_role`" é uma frase
que não pode ser implementada literalmente como policy. O jeito real de tornar uma tabela
append-only até pra `service_role` é **nunca conceder `UPDATE`/`DELETE` a ele via `GRANT`** — isso
é checado antes da RLS e vale pra qualquer role, `BYPASSRLS` ou não. `audit.eventos` recebe só
`GRANT INSERT` (via a função de trigger, não direto) e `GRANT SELECT` — nunca `UPDATE`/`DELETE`
pra ninguém, nem `authenticated` nem `service_role`.

## Trigger genérico, `SECURITY DEFINER`

Uma função só (`audit.registrar_mudanca()`), anexada via `CREATE TRIGGER ... AFTER INSERT OR
UPDATE OR DELETE` em cada tabela de negócio. `SECURITY DEFINER` aqui é a escolha certa (ao
contrário de `crm.meu_cliente_id()`, que evitou de propósito) — é exatamente o caso que justifica:
quem grava a linha de negócio (`authenticated` ou `service_role`) não precisa de nenhum privilégio
extra em `audit.eventos`, e não pode alterar o comportamento da função porque não é dono dela.

```sql
CREATE FUNCTION audit.registrar_mudanca() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = audit, pg_temp AS $$
BEGIN
  INSERT INTO audit.eventos (tabela, operacao, registro_id, dado_anterior, dado_novo, autor)
  VALUES (
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    TG_OP,
    COALESCE((NEW).id, (OLD).id),
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
```

`SET search_path = audit, pg_temp` — obrigatório em toda função `SECURITY DEFINER` (sem isso, um
`search_path` malicioso do chamador poderia sequestrar a função pra rodar outro `audit.eventos`
de mentira). Não é opcional, é o item clássico de CVE de `SECURITY DEFINER` no Postgres.

## Cobertura: todas as 17 tabelas de negócio de E13-S01..S05
`crm.clientes`; `jornada.jornadas/fases/etapas`; `documentos.documentos/solicitacoes_assinatura`;
`pagamentos.pagamentos/dados_recebimento`; `agenda.reunioes/transcricoes`; `programas.programas`;
`comunicacao.conversas/email_threads/eventos/regras_atendimento_ia/fontes_conhecimento`.

Uma linha de `CREATE TRIGGER` por tabela — mecânico, mesma função reaproveitada.

## RLS de `audit.eventos`
Consulta de trilha de auditoria é operação de staff, não de cliente — mesma forma admin-only de
`regras_atendimento_ia` (E13-S05): só `admin` lê, cliente recebe `[]`.

## Fora de escopo
`lgpd.*` (E13-S07) — export/delete de dado pessoal é caso de uso diferente de auditoria (ainda que
os dois leiam histórico). Trigger em tabelas que ainda não existem (`crm.leads`) fica pra quando a
tabela existir.
