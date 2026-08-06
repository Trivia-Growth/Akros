---
name: Definition of Done
description: Gates executáveis que confirmam que uma feature está verdadeiramente completa.
---

# Definition of Done — Akros

Uma feature **não está pronta** até passar em TODOS os gates abaixo. Não é "inspeção visual" — é comando executável.

## 1. Spec & Tasks Integridade

- [ ] Spec.md existe e está linkada no frontmatter de tasks.md
- [ ] AC (Acceptance Criteria) estão em formato Given/When/Then
- [ ] tasks.md existe com **1 task por AC** (mapear T-N → AC-N)
- [ ] Cada task tem um **gate executável** (comando ou script)
- [ ] Nenhum `SPEC_DEVIATION` pendente em tasks.md ou código

## 2. Code & Tests

- [ ] Código segue padrão de arquitetura (domain → application → infrastructure)
- [ ] Código tem **testes** que mapeiam ACs (testes verdes, não inspira confiança = falta cobertura)
- [ ] TypeScript compila sem erros (`pnpm run typecheck`)
- [ ] Linting passa (`pnpm run lint`)
- [ ] Sem `TODO`, `FIXME`, `XXX` comments sem issue linkada

## 3. Banco de Dados

- [ ] Migrations criadas (formato: `NNNN_E0N-S0N_descricao.sql`)
- [ ] RLS policies adicionadas/revisadas (se houver novo acesso)
- [ ] Queries otimizadas (sem N+1, índices apropriados)
- [ ] `db:migrate` roda sem erro local

## 4. Security (Obrigatório)

- [ ] RLS FORCE em toda tabela nova/modificada
- [ ] Sem `service_role` exposto ao cliente
- [ ] Secrets em Vault, não em .env.local ou código
- [ ] Rate limiting em Edge Functions (se houver)
- [ ] OWASP Top 10 checklist (XSS, SQLi, CSRF, etc) — `/security-review` verde

## 5. CI/CD

- [ ] `pnpm run ci:local` verde (= `lefthook run pre-push`)
- [ ] `gh pr checks` verde no PR (sem checks pulados)
- [ ] Build sucesso (`pnpm run build`)

## 6. Documentação & Rastreabilidade

- [ ] Commits seguem padrão: `feat(E0N-S0N): descrição`
- [ ] ADRs criados/atualizados (se mudança de arquitetura)
- [ ] glossary.md atualizado com termos novos
- [ ] docs/STATE.md atualizado com status final
- [ ] docs/ROADMAP.md marcado como ✅

## 7. Revisão Adversarial (QA Gate)

- [ ] AC testadas **por comando** (não visualmente)
- [ ] Borda cases tentadas: erro parcial, timeout, concorrência, abuso
- [ ] Spec buraco encontrado? → ADR ou spec atualizada
- [ ] `/revisao-adversarial` rodou e retornou verde

## 8. DevOps / Merge

- [ ] Branch atualizado com main (sem merge conflicts)
- [ ] PR abre (título + descrição com AC ref)
- [ ] PR mergeado por `@devops` (único com permissão)
- [ ] Feature branch deletada após merge

---

## Como verificar

```bash
# Spec & Tasks
grep -r "SPEC_DEVIATION" specs/E*/

# Code
pnpm run typecheck && pnpm run lint && pnpm run test

# CI/CD local
pnpm run ci:local

# Database
supabase db pull  # Verifica migrações pendentes

# Security
/security-review
```

## Bloqueadores Comuns

- **Spec ambígua** → `@pm` não clarificou. Diga "não faço até ter spec clara".
- **Tasks faltando gates** → `@sm` incompletou. Volte pro `@sm`.
- **Adversarial falha** → achado vira teste, volta pro `@dev`. Iterai.
- **Security debt** → marque em `docs/SECURITY_DEBT.md`, crie issue separada se não-bloqueador.

---

**Lembrete:** "Gate verde" = "caminho feliz funciona", não = "código perfeito". Adversarial mata bugs que DoD não vê.
