---
name: runbook-rollback
description: Procedimento de rollback — reverter deploy, reverter migration e o caso de migration sem deploy. Passo a passo copiável. Puxe durante incidente.
alwaysApply: false
---

# Runbook — Rollback

> **Estado deste documento:** escrito em 2026-08-30 a partir de E16-S01 AC-5. Os comandos marcados
> `[NÃO EXECUTADO]` ainda não foram rodados neste projeto — a task 5 de
> `specs/E16-S01-operacao-deploy/tasks.md` exige executar cada um em ambiente de teste e colar a
> saída aqui antes de o runbook ser considerado pronto. Runbook não verificado é ficção com
> aparência de procedimento; a marcação existe para você saber em qual está apoiando.

## Antes de qualquer coisa: qual é o caso?

| Sintoma | Caso | Vá para |
|---------|------|---------|
| Front quebrado, banco intacto | Só o deploy é ruim | § 1 |
| Erro de banco, front antigo funcionava | Só a migration é ruim | § 2 |
| Deploy revertido mas o erro continua | Migration subiu sozinha | § 3 |

**Regra que vale nos três casos:** reverta primeiro, investigue depois. Log e trace ficam; o
usuário quebrado, não.

## § 1 — Reverter o deploy (Netlify)

O deploy anterior continua publicado e imutável no Netlify — reverter é republicar, não rebuildar.
É a operação mais rápida e a de menor risco.

```bash
# 1. Liste os deploys recentes e ache o último bom (estado "ready", antes do incidente)
netlify deploy:list --json | head -40          # [NÃO EXECUTADO]

# 2. Republique aquele deploy
netlify api restoreSiteDeploy --data '{"site_id":"<SITE_ID>","deploy_id":"<DEPLOY_ID>"}'
                                                # [NÃO EXECUTADO]

# 3. Confirme que a URL de produção serve o hash antigo
curl -sI https://<dominio> | grep -i "x-nf-request-id\|etag"
```

Pela interface: **Deploys → o deploy bom → Publish deploy**. Use este caminho se estiver sem CLI
autenticado; é o mesmo efeito.

**Depois de reverter:** abra a revert no git (`git revert <sha>`), não force-push em `main`.
Histórico reescrito durante incidente é como se perde o rastro do que aconteceu.

## § 2 — Reverter uma migration (Supabase)

**Migration aplicada é imutável** (convenção do projeto, ver `db/README.md`). Não edite o arquivo
já aplicado, não apague. Reverter significa **escrever uma migration nova** que desfaz.

```bash
# 1. Veja o que está aplicado no projeto remoto
supabase migration list                         # [NÃO EXECUTADO]

# 2. Crie a migration de reversão, seguindo a numeração (nunca pula) e o padrão de nome
#    NNNN_E0N-S0N_reverte_<o-que>.sql — ver db/README.md
#    Todo DROP destrutivo precisa do comentário '-- Reverso:' ou o gate lint:migrations barra.

# 3. Valide ANTES de aplicar
pnpm run lint:migrations
psql "$DATABASE_URL_TESTE" -v ON_ERROR_STOP=1 -f supabase/migrations/<nova>.sql

# 4. Aplique
supabase db push                                # [NÃO EXECUTADO]
```

**Quando o `DROP` já levou dado junto**, reverter o schema não traz o dado de volta. Aí a ordem é:
restaurar do backup point-in-time do Supabase **primeiro**, e só depois aplicar a reversão de
schema. Restaurar depois sobrescreve o que você tiver consertado no meio tempo.

## § 3 — Migration subiu, deploy não (ou vice-versa)

O caso mais confuso, e o mais provável de acontecer: os dois artefatos têm ciclos de vida
diferentes e nada hoje os aplica de forma atômica.

**Migration nova + front antigo** — normalmente tolerável se a migration for aditiva (coluna nova,
tabela nova): o front antigo ignora o que não conhece. Fica intolerável se a migration for
destrutiva ou renomeadora. Então:

1. Não tente "voltar o banco" antes de saber se a migration é aditiva. Confira o SQL.
2. Aditiva → publique o deploy correto (§ 1) e siga em frente. Não reverta o banco.
3. Destrutiva → § 2, com a ressalva de dado perdido acima.

**Front novo + migration não aplicada** — o front chama coluna que não existe; o erro aparece como
falha de PostgREST, não como bug de UI. Reverta o deploy (§ 1) e aplique a migration com calma.

**Como evitar o caso:** migration aditiva primeiro, deploy depois, remoção do que ficou órfão numa
terceira etapa (*expand / migrate / contract*). Nunca uma migration destrutiva no mesmo passo do
deploy que depende dela.

## Depois do incidente
- Registre o que aconteceu em `docs/STATE.md` (handoff) e, se a causa for decisão de arquitetura,
  abra ADR.
- Se a causa foi lacuna de gate, o achado vira teste — regra de saída da `/revisao-adversarial`.
- Se sobrou risco aceito, ele vira linha em `docs/SECURITY_DEBT.md`.
