---
name: SPEC
description: Contrato (AC) da resiliência de módulo — falha contida, navegação viva, chunk com retry. E15-S01.
story: E15-S01
tier: arquitetural
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

### AC-6 — O site institucional não se mistura com o resto
**Given** o código de `apps/web/src/features/`
**When** `pnpm run arch:check` roda
**Then** importação de `features/site` para qualquer outro domínio — ou de qualquer domínio para
`features/site` — falha o gate, e existe teste provando que ele falha com uma importação cruzada
introduzida de propósito.

> **Refinado durante a implementação (2026-08-31).** O AC dizia "frente não importa frente". Ao
> escrever a regra, ficou claro que as três frentes **não** mapeiam uma-para-uma em pastas de
> feature: portal e admin compartilham bounded context de propósito (`crm` tem a `PerfilPage` do
> portal e a `Clientes360Page` do admin). Proibir importação entre eles seria proibir o desenho
> correto. A fronteira que existe de verdade é a do site institucional — que é justamente o canal
> de captação de lead, o que mais importa proteger. Entre portal e admin o isolamento é de chunk e
> de fronteira de falha (AC-1 a AC-4), não de importação.
