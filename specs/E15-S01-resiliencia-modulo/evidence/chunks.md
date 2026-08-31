---
name: EVIDENCE-chunks
description: Tamanho dos chunks antes e depois do code-splitting de E15-S01 (AC-4).
alwaysApply: false
---

# Evidência — chunks antes/depois (E15-S01 AC-4)

Medido com `pnpm --filter @akros/web exec vite build`.

## Antes (2026-08-30, antes desta story)

```
dist/assets/index--QuD_SbF.js   850,74 kB │ gzip: 236,92 kB   ← chunk único, tudo dentro
dist/assets/index-D9r2dt7f.css   63,69 kB │ gzip:  11,01 kB
```

Um único chunk com site + portal + admin. Visitar a home baixava e executava o painel admin
inteiro.

## Depois

- **68 chunks JavaScript**: um por rota, mais os vendors separados.
- Chunk de entrada: **596,25 kB** — era 850,74 kB, **30% menor**.
- Soma de todos os `.js`: 1071,73 kB. Maior que antes, e isso é esperado: dividir acrescenta
  overhead, mas ninguém baixa o total. Uma visita ao site institucional carrega a entrada mais o
  chunk da `HomePage` — nenhuma das 14 telas do admin.

### Maiores chunks

| Chunk | Tamanho |
|---|---|
| `index` | 596,25 kB |
| `vendor` | 101,06 kB |
| `ContatosPage` | 58,16 kB |
| `vendor` | 55,13 kB |
| `ComunicacaoPage` | 36,03 kB |
| `Clientes360Page` | 26,65 kB |
| `ConfiguracoesPage` | 24,80 kB |
| `ProgramasPage` | 16,82 kB |
| `KanbanPage` | 15,47 kB |
| `HomePage` | 14,25 kB |
| `DashboardPage` | 10,83 kB |
| `PerfilPage` | 10,83 kB |

## O que ainda está no chunk de entrada, e por quê

`app/di.ts` importa todos os adapters de forma estática, o que arrasta `src/mocks/` (cerca de
3.900 linhas de fixture) e o `@supabase/supabase-js` junto. Está registrado como
`SPEC_DEVIATION` no próprio `di.ts`.

Não foi resolvido aqui de propósito: separar exigiria tornar o container assíncrono — toda porta
passaria a resolver por Promise —, que é mudança de arquitetura e não é o problema desta story.
E15-S01 é sobre **contenção de falha**, não sobre dieta de bundle. Encolhe sozinho a partir de
E13-S09, quando os adapters mock forem substituídos pelos reais.
