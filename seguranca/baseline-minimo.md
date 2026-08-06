---
name: BASELINE-MINIMO
description: Checklist mínimo de segurança obrigatório em TODO código produção.
alwaysApply: false
---

# Baseline de Segurança Mínima — Akros

Nem todo código precisa passar por review de segurança profundo, mas TODO código **DEVE**
atender estes requerimentos mínimos antes de produção.

## 1. Input Validation & Output Encoding

- [ ] Input na borda (API, forms) validado com **Zod** (ou similar)
- [ ] Output escrito em HTML/SQL **escapado** (nunca `innerHTML`, use React props)
- [ ] Sem `dangerouslySetInnerHTML` a menos que 100% confiável
- [ ] SQL queries via **parameterized** (Supabase client, não string concat)

## 2. Autenticação & Sessão

- [ ] Tokens JWT armazenados em **HttpOnly cookies** (não localStorage)
- [ ] Refresh tokens **rotacionados** em cada use
- [ ] Session timeout configurado (inatividade ~30min)
- [ ] Logout invalida token no backend (black-list ou revoke)

## 3. Autorização & RLS

- [ ] Toda tabela tem **RLS FORCE** ativo
- [ ] RLS policies testadas (SELECT/INSERT/UPDATE/DELETE conforme role)
- [ ] `service_role` **nunca** usado no client (só no backend/Edge Functions)
- [ ] Roles/permissions mapeadas em `docs/ARCHITECTURE.md` ou `docs/glossary.md`

## 4. Secrets & Credentials

- [ ] **Nenhum secret** em código (`.env.local` excluído do repo)
- [ ] Secrets em **Vault** (Supabase ou similar)
- [ ] API keys rotacionadas periodicamente (documente ciclo)
- [ ] Webhook signatures verificadas com **HMAC** (ver seguranca/webhook.md)

## 5. HTTPS & TLS

- [ ] HTTPS obrigatório em produção
- [ ] Supabase dashboard HTTPS ✅
- [ ] Third-party APIs via HTTPS
- [ ] Certificados válidos (não self-signed em prod)

## 6. Logging & Monitoring

- [ ] Não loga **senhas, tokens, PII** (filtrar em logger)
- [ ] Logs centralizados (Supabase audit, ou observabilidade)
- [ ] Alertas configurados para erro/rate-limit/anomalia

## 7. Dependências & Updates

- [ ] `pnpm audit` rodando em CI (quebra build se vulnerabilidade alta)
- [ ] Pacotes mantidos (sem maior lag de versions)
- [ ] Security advisories monitoradas (dependabot ou similar)

## 8. CORS & CSP

- [ ] CORS restrito (não `*`, específico ao domínio cliente)
- [ ] Content-Security-Policy header configurado
- [ ] Frame-ancestor restringido (se SPA, `DENY`)

---

## Checklist rápido pré-produção

```bash
# Rode antes de cada deploy
pnpm audit
pnpm run lint          # Linter catches some patterns
pnpm run typecheck
grep -r "TODO SECURITY\|FIXME SEC\|XXX SEC" src/
grep -r "dangerouslySetInnerHTML\|eval(" src/
```

Se algo acender, **PARE** e resolve antes de deploy.

## Referências
- **CLAUDE.md** — Segurança OS-grade (RLS, audit, Vault)
- **docs/ARCHITECTURE.md** — Fluxo de dados, integrações
- **docs/SECURITY_DEBT.md** — Dívida acumulada (review periodicamente)
