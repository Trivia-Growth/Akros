# Tasks: IA de apoio ao processo (E07-S05)

**Input**: spec.md, plan.md, research.md, data-model.md, contracts/, quickstart.md

Convenção de migration: próximo número sequencial depois da última aplicada.

## Phase 1: Foundational

- [X] T001 Migration `NNNN_E07-S05_pre_analise_rascunho_chamadas_ia.sql`: `documentos.pre_analises`,
  `documentos.rascunhos_resposta`, `documentos.chamadas_ia` (append-only), coluna
  `crm.clientes.ia_apoio_ativa boolean not null default true`. RLS por papel (mesmo predicado de
  `documentos.documentos`); `chamadas_ia` sem GRANT de UPDATE/DELETE a ninguém.
- [X] T002 [P] `apps/web/src/features/documentos/domain/mascaramento.ts`: regras puras (camada 1 —
  substituição por valor conhecido do cadastro; camada 2 — regex de padrões estruturados).
- [X] T003 [P] `supabase/functions/_shared/mascaramento-pii.ts`: espelha T002 no runtime Deno (sem
  import cruzado entre os dois runtimes, mesmo critério do resto do repositório).
- [X] T004 [P] `supabase/functions/_shared/pre-analise-pdf.ts`: metadados de PDF (páginas, texto
  pesquisável vs não) — **SPEC_DEVIATION registrada**: resolução/corte de página fica como
  heurística simplificada (ver nota em T006), não a aproximação por DPI efetivo do research.md
  item 3; sem validação de biblioteca de imagem nesta rodada.

## Phase 2: US1 — Pré-análise local (sem IA, sem rede externa)

- [X] T005 `supabase/functions/documento-pre-analisar/index.ts` + `_shared/documento-pre-analisar.ts`:
  job chamado pelo mesmo gatilho de `arquivo-processar` quando `estado_armazenamento` vira
  `armazenado` para versão com `documento_id`. Usa T004, grava `documentos.pre_analises`.
- [X] T006 Ajuste de escopo (SPEC_DEVIATION, registrada aqui e no código): sem biblioteca de
  decodificação de imagem validada nesta sessão, a checagem de "resolução suficiente" usa proxy
  (tamanho de bytes por página) em vez de DPI efetivo real — motivo: não há como validar a
  biblioteca de imagem sem rodar contra arquivo real, e a sessão não tem esse passo de teste.
  Fica documentado como dívida técnica em `docs/SECURITY_DEBT.md`, não é erro silencioso.
- [X] T007 `apps/web/src/features/documentos/application/ports.ts`: adiciona `obterPreAnalise` à
  `AnalisadorDocumentoPort`.
- [X] T008 `apps/web/src/features/documentos/infrastructure/SupabaseAnalisadorDocumentoReal.ts`:
  implementa `obterPreAnalise` (leitura) e `analisar`/`rascunharResposta` (fases seguintes).
- [X] T009 `FilaRevisaoRealPage.tsx`: exibe selo de pré-análise (legível / motivo do problema).

## Phase 3: Toggle de IA por caso (FR-010)

- [X] T010 RPC `crm.definir_ia_apoio(p_cliente_id, p_ativa, p_autor_id)` na mesma migration de T001
  ou migration própria — mesmo template SECURITY DEFINER do restante da feature E03-S07.
- [X] T011 Ação `definir_ia_apoio` em `_shared/caso-comandos.ts` (schema Zod + case no switch),
  reaproveitando `caso-comandos/index.ts` já publicado.
- [X] T012 UI: toggle em `Clientes360RealPage.tsx` (aba de dados do caso).

## Phase 4: US2 — Cruzamento com requisito (texto mascarado, OpenRouter)

- [X] T013 `supabase/functions/_shared/documento-cruzamento.ts`: extrai texto (só PDF pesquisável
  nesta rodada — **SPEC_DEVIATION**: OCR de imagem escaneada via Tesseract.js fica fora; sem
  spike para validar que cabe numa Edge Function, documento escaneado é marcado
  "requer revisão manual" em vez de arriscar OCR não testado em produção), aplica T003, chama
  OpenRouter (reaproveita `_shared/openrouter.ts`, escopo de Vault
  `escopoOpenRouter("ia-apoio-processo")`), grava `documentos.documentos.analise` +
  `documentos.chamadas_ia`.
- [X] T014 `supabase/functions/documento-ocr-cruzamento/index.ts`: monta adapters reais, confere
  `ia_apoio_ativa` do caso (422 se desligada) e `pre_analises` (422/marca indisponível se
  ilegível), despacha para T013.
- [X] T015 UI de configuração da chave OpenRouter desta finalidade (mesmo padrão de
  `CanalEvolutionPainel`/`agente-playground`), em Configurações.
- [X] T016 `FilaRevisaoRealPage.tsx`: botão "Analisar com IA" dispara T014; exibe parecer real
  (reaproveita o bloco de `AnaliseDocumento` já existente na tela).

## Phase 5: US3 — Rascunho de resposta

- [X] T017 `supabase/functions/_shared/documento-rascunho.ts`: monta prompt estruturado
  (`research.md` item 7) a partir do parecer (T013) + `crm.contratos`, chama OpenRouter, grava
  `documentos.rascunhos_resposta` + `documentos.chamadas_ia`.
- [X] T018 `supabase/functions/documento-rascunho-resposta/index.ts`: monta adapters, despacha.
- [X] T019 UI: botão "Gerar rascunho de resposta" + área de edição em `FilaRevisaoRealPage.tsx`.

## Phase 6: Polish

- [X] T020 i18n (`admin.json` pt-BR/en): `aiSupport.*`.
- [X] T021 `docs/glossary.md`: "pré-análise", "parecer de cruzamento", "rascunho de resposta",
  "IA de apoio ao processo".
- [X] T022 `docs/SECURITY_DEBT.md`: registra as duas SPEC_DEVIATION (T006, T013) e a chave
  OpenRouter desta finalidade como superfície nova de dado (mascarado) saindo da Akros.
- [ ] T023 Registrar evidência dos cenários do `quickstart.md`. **Não executada nesta sessão** —
  usuário instruiu seguir sem rodar testes/gates; migrations/functions desta feature ainda
  precisam ser aplicadas/publicadas no Supabase remoto antes de qualquer execução real.

## Decisão de implementação registrada

Provedor de IA: OpenRouter com chave exclusiva (`research.md` item 6, decisão do usuário em
2026-11-06) — sem ADR bloqueando, mecanismo já aprovado para o agente de atendimento (E13-S12).
