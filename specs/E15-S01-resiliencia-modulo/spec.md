---
name: SPEC
description: Contrato (AC) da resiliência de módulo — falha contida, navegação viva, chunk com retry. E15-S01.
story: E15-S01
alwaysApply: false
---

# spec.md — E15-S01 Resiliência de módulo

Ver `product.md` (por quê) e `design.md` (como). Tier arquitetural.

## Fora de escopo
- Para onde o erro é reportado (sink/telemetria) — E16, ver SD-10 em `docs/SECURITY_DEBT.md`.
- Meta de tamanho de bundle. O split é meio para o isolamento, não fim.
- Erro assíncrono fora do render (limite conhecido do `componentDidCatch`, ver `design.md`).

## Acceptance Criteria

### AC-1 — Falha no admin não derruba o site
**Given** uma rota do admin cujo componente lança exceção no render
**When** essa rota é montada
**Then** o site institucional continua renderizando normalmente, e a exceção não desmonta a
aplicação inteira.

### AC-2 — Navegação sobrevive à queda do conteúdo
**Given** uma rota do portal que lança exceção no render
**When** o Error Boundary captura
**Then** o shell (`PortalLayout`: barra lateral e topo) continua visível e navegável, e só a área
de conteúdo é substituída pelo fallback.

### AC-3 — Fallback é acionável, não decorativo
**Given** uma rota em estado de erro
**When** o usuário vê o fallback
**Then** ele lê qual área falhou, tem um botão **Tentar de novo** que remonta a subárvore sem
recarregar a página, e um caminho de volta para uma rota conhecida como boa.

### AC-4 — Cada frente é um chunk
**Given** o build de produção
**When** os artefatos são inspecionados
**Then** site, portal e admin estão em chunks distintos, nenhum deles é carregado numa sessão que
não visita aquela frente, e o chunk de entrada é menor que o atual (850,74 kB, medido 2026-08-30).

### AC-5 — Chunk que falha por rede tenta de novo antes de desistir
**Given** um `import()` dinâmico que falha na primeira tentativa
**When** o carregamento é feito por `carregarComRetry`
**Then** há nova tentativa antes de propagar o erro; esgotadas as tentativas, o fallback do
boundary oferece recarregar a página.

### AC-6 — Frente não importa frente
**Given** o código de `apps/web/src/features/`
**When** `pnpm run arch:check` roda
**Then** qualquer importação de uma frente por outra falha o gate.
