---
name: DB
description: Banco de dados, migrations, RLS policies. Referência para estrutura de schema.
alwaysApply: false
---

# db/ — Database Akros

## Estrutura

```
db/
├── README.md                 # Este arquivo
├── rls.template.sql          # Template de RLS policies
├── migrations/               # Migrações versionadas
│   ├── 0001_E00-S00_setup.sql
│   ├── 0002_E01-S01_nova_tabela.sql
│   └── ...
└── rollback/                 # Scripts de reversão (backup, nunca usar em prod)
```

## Migration Format

Nome: `NNNN_E0N-S0N_descricao.sql`

- `NNNN`: sequência crescente (0001, 0002, …) — garante ordem de execução
- `E0N-S0N`: épico + story que criou esta migration
- `descricao`: slug resumido do que a migration faz

Exemplo:
```
0001_E00-S00_tabelas_base.sql     # Setup inicial
0002_E01-S01_tabela_pedidos.sql   # Domínio de pedidos
0003_E01-S02_rls_pedidos.sql      # RLS policies para pedidos
```

## Escrita de Migration

```sql
-- Description: [O que esta migration faz em PT-BR]
-- Story: E0N-S0N
-- Created: YYYY-MM-DD

-- Rollback: [Comando de reversão, se houver]

BEGIN;

-- Sua DDL aqui
CREATE TABLE IF NOT EXISTS public.sua_tabela (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS FORCE (obrigatório)
ALTER TABLE public.sua_tabela ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own rows"
  ON public.sua_tabela
  FOR SELECT
  USING (auth.uid() = user_id);

COMMIT;
```

## RLS Rules

Toda tabela nova **DEVE ter**:
1. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
2. Pelo menos uma política SELECT
3. Policies para INSERT/UPDATE/DELETE conforme negócio

Não é "implementação detalhada" — é **obrigatório de segurança**. Ver `rls.template.sql`.

## Executar Migrations

```bash
# Pull schema atual do Supabase
supabase db pull

# Push local migrations pra Supabase
supabase db push

# Criar nova migration (interativa)
supabase migration new <nome>
```

## Referências
- **CLAUDE.md** — convenções de naming (migration names com E0N-S0N)
- **db/rls.template.sql** — template de RLS policies
- **docs/ARCHITECTURE.md** — schemas e data model
- **docs/SECURITY_DEBT.md** — dívida de segurança identificada
