---
name: DESIGN
description: Schema lgpd (consentimentos, solicitações de export/delete) — oitava réplica do padrão.
story: E13-S07
alwaysApply: false
---

# design.md — E13-S07 Schema `lgpd`

Mecanismo já fechado. Duas tabelas, sem entidade de domínio prévia (não existiam no mock) —
nascem diretamente do requisito de `seguranca/os-grade.md` (*"Schema `lgpd.*` para consentimentos,
export e delete; trilha em `audit.*`"*).

```sql
CREATE TABLE lgpd.consentimentos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    uuid NOT NULL REFERENCES crm.clientes(id),
  tipo          text NOT NULL,  -- ex.: 'processamento_dados', 'marketing'
  aceito        boolean NOT NULL,
  aceito_em     timestamptz NOT NULL DEFAULT now(),
  revogado_em   timestamptz
);

CREATE TABLE lgpd.solicitacoes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        uuid NOT NULL REFERENCES crm.clientes(id),
  tipo              text NOT NULL CHECK (tipo IN ('export', 'delete')),
  status            text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida', 'negada')),
  solicitado_em     timestamptz NOT NULL DEFAULT now(),
  concluido_em      timestamptz,
  motivo_negacao    text
);
```

RLS: cliente cria e lê as próprias linhas (consentimento é ato do titular; solicitação de
export/delete também parte dele); só admin muda `status`/`concluido_em`/`motivo_negacao` de uma
solicitação (processamento é manual, por ora — sem automação de export/delete real ainda, isso é
story de produto separada quando vier a existir volume de dado real pra exportar/apagar).

Ambas as tabelas entram na cobertura de `audit.*` (E13-S06) — trigger igual às demais.

## Fora de escopo
Automação real de export (gerar arquivo) / delete (anonimizar linhas em cascata) — a tabela só
registra a solicitação e seu status; executar de fato é E13-S08+ ou story própria quando houver
dado real de cliente pra processar. Retenção de dado de lead perdido (ROADMAP pergunta 6) segue
em aberto — não modelada aqui porque depende de `crm.leads`, que não existe.
