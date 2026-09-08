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

### AC-7 — O formulário público continua criando lead
**Given** um visitante **não autenticado** na página `/contatos`
**When** ele envia o formulário
**Then** o lead nasce em `crm.leads`, sem que `anon` tenha permissão de escrita direta na tabela.

> **AC acrescentado em 2026-08-31, durante a implementação — é um buraco desta própria spec.**
> O AC-1 fala em "a equipe converte o lead em cliente" e eu nunca perguntei **quem cria o lead**.
> Quem cria é um visitante anônimo, e a RLS que escrevi é admin-only: verificado contra o banco
> real, o `INSERT` anônimo devolve `401 permission denied for schema crm`. Ligar o adapter sem
> isto quebraria a captação de lead, que é a função principal do site institucional.
>
> A saída **não** é dar `INSERT` para `anon` — isso abre escrita pública no CRM, ou seja, spam
> direto na base. É uma Edge Function `lead-capturar` que valida com Zod, insere com
> `service_role` e passa pelo rate limit de E14-S01. Mesma forma das funções de sessão.

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

### AC-6 — Nenhuma tela chama hook depois de early return
**Given** qualquer componente do app
**When** `pnpm lint` roda
**Then** hook chamado depois de um `return` condicional falha o gate.

> **Virou gate em 2026-08-31, e o AC mudou junto.** O texto original pedia auditoria "tela a tela"
> nas telas tocadas — trabalho manual, que só cobre esta story e apodrece na próxima. O Biome tem
> `correctness/useHookAtTopLevel`, que é exatamente esta regra: ligado, o código atual passa limpo
> (o fix de E13-S08 segurou) e a armadilha deixa de depender de alguém lembrar. Provado que o gate
> falha com uma violação proposital antes de ser considerado ativo.
