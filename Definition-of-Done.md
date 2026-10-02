---
name: Definition of Done
description: Checklist curto, com gates executáveis, que confirma que uma feature está completa (spec-kit + segurança + CI enxuta).
---

# Definition of Done — Akros

Uma feature **não está pronta** até passar em TODOS os gates abaixo. Não é "inspeção visual" — é comando executável.

## 1. Spec e tasks (spec-kit)

- [ ] `specs/NNN-<slug>/` tem `spec.md`, `plan.md` e `tasks.md` (feature trivial dispensa — ADR-0015)
- [ ] `spec.md` leva o ID da story (`E0N-S0N`) no cabeçalho; Acceptance Scenarios em Given/When/Then
- [ ] `plan.md` passou o *Constitution Check* (`.specify/memory/constitution.md`)
- [ ] Todo Acceptance Scenario tem task e teste; toda task tem gate executável
      (`/speckit-analyze` não aponta lacuna aberta)
- [ ] `/speckit-converge` reporta **Converged**
- [ ] Nenhum `SPEC_DEVIATION` pendente em `tasks.md` ou no código
- [ ] **SE tem UI:** impeccable checklist preenchido (ver seção 7 abaixo)

## 2. Código e testes

- [ ] Código segue a arquitetura (`interfaces → application → domain ← infrastructure`; `pnpm run arch:check`)
- [ ] Testes mapeiam os Acceptance Scenarios; typecheck e Biome verdes
- [ ] Sem `TODO`, `FIXME`, `XXX` sem issue linkada

## 3. Banco e segurança (obrigatório)

- [ ] Migration `NNNN_E0N-S0N_descricao.sql`, com reverso, aplicando do zero (`db-tests`)
- [ ] **RLS FORCE** em toda tabela nova/modificada e GRANT explícito por papel
      (`pnpm run lint:migrations`)
- [ ] Policy de UPDATE do cliente não altera estado de processo (pagamento, etapa, documento);
      transição por RPC/Edge Function com auditoria
- [ ] Sem `service_role` no cliente; segredo no Vault, nunca em `.env.local` ou código
- [ ] Edge Function pública com rate limit e entrada validada (`pnpm run check:edge-functions`)
- [ ] Mexeu em auth, RLS ou sessão: `pnpm e2e` verde

## 4. CI

- [ ] `pnpm run ci:local` verde (= `lefthook run pre-push`)
- [ ] `gh pr checks` verde no PR: agregador `ci` (cobre `qualidade`, `seguranca` e `db-tests`; sem check pulado)

## 5. Documentação e rastreabilidade

- [ ] Commits no padrão `feat(E0N-S0N): descrição`
- [ ] ADR criado/atualizado se a decisão é difícil de reverter
- [ ] `docs/glossary.md`, `docs/STATE.md` e `docs/epics/ROADMAP.md` atualizados

## 6. Revisão adversarial (QA gate)

- [ ] `/revisao-adversarial` rodou: borda, erro parcial, concorrência e abuso tentados
- [ ] Achado reproduzido virou teste; buraco na spec virou ADR ou spec atualizada

## 7. UI Polish — impeccable (OBRIGATÓRIO se feature tem UI)

Se feature toca frontend (`apps/web/src/interfaces/` ou componentes), deve passar por impeccable.

**Checklist — 5 Pilares:**

### Spacing & Alignment
- [ ] Spacing intencional (não grid 8px everywhere)
- [ ] Whitespace agrupa conceitos
- [ ] Sem "branco vazio" no meio

### Typography
- [ ] Font não-genérica (com personalidade)
- [ ] Tamanhos seguem escala harmônica (12→14→16→18→20→24→32→40→48)
- [ ] Line-height varia por tamanho (pequeno: 1.5, grande: 1.2)
- [ ] Font-weight intencional
- [ ] Maiúsculas tem letter-spacing

### Color & Contrast
- [ ] Paleta coerente (não 12 tons de azul)
- [ ] Contrast suficiente (WCAG AA)
- [ ] Cor tem razão (não "porque ficou bonito")
- [ ] Dark mode é intentional (não auto-gerado)

### Interaction & Animation
- [ ] Animações têm propósito (feedback, reveal, etc)
- [ ] Duração apropriada (250ms feedback, 600ms reveal)
- [ ] Easing natural (não linear)
- [ ] Hover/focus/active distintos visualmente
- [ ] prefers-reduced-motion respeitado

### Consistency & Details
- [ ] Ícones mesma set (não misturar Feather + Heroicons)
- [ ] Border-radius escala (4px→8px→12px)
- [ ] Shadows profundidade clara (1-2 níveis)
- [ ] Form fields mesma height/padding
- [ ] Empty/loading/error states designados

**Gate:**
```bash
# Screenshots antes/depois (side-by-side)
# Cada mudança tem razão documentada (não "porque ficou melhor")
# Peer review passou (outro olho humano)
```

---

## 8. DevOps / Merge

- [ ] Branch atualizado com main (sem merge conflicts)
- [ ] PR abre (título + descrição com AC ref)
- [ ] PR mergeado por `@devops` (único com permissão)
- [ ] Feature branch deletada após merge

---

## Como verificar

```bash
# Spec & Tasks
grep -r "SPEC_DEVIATION" specs/ apps/ supabase/

# Code
pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run arch:check

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
