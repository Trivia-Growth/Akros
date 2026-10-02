# Tasks: Playground do agente e agente sem canal

**Story**: E13-S14 | **Spec**: [spec.md](./spec.md)

- [x] T-01 [US1-3] `canal` opcional no schema, `alma` até 16 mil caracteres — gate: `deno test` do
      schema (canal sem agente inválido, só agente válido)
- [x] T-02 [US1-1,US1-2] `integracoes-ia-salvar` salva só o agente quando não há canal — gate:
      `deno check` + schema; tela: corpo sem `canal`
- [x] T-03 [US2-1..US2-3] `decidirResposta` compartilhada entre produção e Playground — gate: testes do
      pipeline continuam verdes + testes novos da decisão
- [x] T-04 [US2,US3] `agente-playground` (admin, CSRF, limite de 120/h, sem escrita) — gate:
      `playground.test.ts` (11 casos, 5 mutações vermelhas)
- [x] T-05 [US3] `explicarErroIA` por status — gate: testes de 401/402/404/429/5xx
- [x] T-06 [US2] Componente Playground na aba Agente IA — gate: 9 testes de tela
- [x] T-07 [US1] Formulário com "Conectar um canal agora" (desmarcado) — gate: testes da tela
- [x] T-08 Verificação completa (lint, typecheck, 197 vitest, 80 deno, build, arch, edge gate)
- [ ] T-09 Rollout: deploy de `agente-playground` e `integracoes-ia-salvar`; teste no site real
