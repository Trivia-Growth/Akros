---
name: SPEC
description: Contrato (AC) da saída do mock nos 4 contextos restantes — fecha os dois P0 de dado real. E13-S09.
story: E13-S09
tier: arquitetural
alwaysApply: false
---

# spec.md — E13-S09 Sair do mock: os 4 contextos restantes

Fecha os dois `P0` de `docs/SECURITY_DEBT.md` sobre dado real. Ver `product.md` e `design.md`.

## Fora de escopo
- Realtime (ADR-0009, operador único).
- `MockAnalisadorDocumento` → LLM real (é SD-04, depende de decisão de PII).
- Modo demo, que continua lendo mock de propósito.

## Acceptance Criteria

### AC-1 — `crm.leads` existe e o lead vira cliente de verdade
**Given** um lead no kanban e `isDemoMode = false`
**When** a equipe converte o lead em cliente
**Then** a linha nasce em `crm.clientes` no banco, e `criarAPartirDeLead` deixa de lançar erro.

### AC-2 — Os 4 contextos leem do banco
**Given** `isDemoMode = false`
**When** o cliente abre jornada, documentos, pagamentos e mensagens
**Then** o dado exibido vem do Supabase, e nenhuma dessas telas chama `useMockDb`.

### AC-3 — A store fictícia não é carregada fora do modo demo
**Given** a aplicação montada com `VITE_DEMO_MODE=false`
**When** o estado global é inspecionado
**Then** `useMockDb` está vazia — provado por teste, não por inspeção no DevTools.

### AC-4 — O mapa de id temporário é deletado
**Given** os 4 contextos migrados
**When** o código de `SupabaseClienteRepository` é lido
**Then** `MAPA_ID_REAL_PARA_MOCK` **não existe mais** e a `SPEC_DEVIATION` correspondente foi
removida — todo mundo fala uuid.

### AC-5 — Cliente A não vê dado de cliente B, pela aplicação
**Given** dois clientes seed com jornada, documento e pagamento distintos
**When** o cliente A navega o portal autenticado
**Then** nenhum dado de B aparece — verificado pelo e2e, exercitando a RLS **pelo caminho que o
usuário usa**, não só por `curl` no PostgREST.

### AC-6 — Nenhuma tela migrada chama hook depois de early return
**Given** as telas tocadas nesta story
**When** elas renderizam com o dado ainda carregando
**Then** a contagem de hooks é estável entre renderizações — a armadilha que derrubou a aplicação
em E13-S08 não se repete.
