---
name: SPEC
description: Jornada gamificada (Introdução + 5 fases) com unlock sequencial.
story: E02-S02
tier: pequeno
---

# SPEC — Jornada Gamificada (E02-S02)

## User Story
Como **cliente**, quero **percorrer minha jornada de visto em fases que se desbloqueiam conforme avanço**,
para que **eu me sinta guiado, motivado e sem me perder no processo**.

## Contexto
Coração do produto. **Introdução + 5 fases** (ver `docs/PROJECT.md` para o conteúdo real de cada,
derivado do manual EB-2 NIW). **Unlock sequencial:** fase N+1 só fica disponível quando o **admin
libera** após a fase N (gate — `JornadaRepository.liberarFase`). Gamificação explícita.

## As 6 fases (conteúdo)
- **0 · Introdução** — boas-vindas, canais de comunicação, envio de documentos, traduções certificadas.
- **1 · Documentação e Currículo** — contrato + pagamento inicial, kick-off, currículo especializado, documentos comprobatórios.
- **2 · Business Plan e Cartas** — checkpoint I, Business Plan, cartas de recomendação (~15du), cartas de experiência (~10du), avaliação educacional (~15du).
- **3 · Viabilidade Econômica e Formulários** — checkpoint II, comprovação de viabilidade/comprometimento, questionários + taxa federal USCIS (US$1.015; I-140+ETA).
- **4 · Finalização e Envio à USCIS** — carta de suporte (Petition Letter), revisão final + envio rastreado.
- **5 · Pós-aprovação / Relocation** — acompanhamento USCIS (RFE/aprovação), consular processing/ajuste de status, preparação para mudança.

## Acceptance Criteria

### AC-1: Visão da trilha (mapa gamificado)
```gherkin
Given  a jornada do cliente
When   acesso /portal/jornada
Then   vejo as 6 fases como uma trilha/mapa (estilo game)
And    cada fase mostra status: concluída, em andamento, liberada, ou bloqueada (cadeado)
And    a fase atual é destacada
```

### AC-2: Detalhe de uma fase liberada
```gherkin
Given  uma fase liberada ou em andamento
When   abro a fase
Then   vejo suas etapas/tarefas com descrição, prazos médios (quando houver) e status
And    posso marcar/consultar ações (enviar documento, agendar reunião, assinar) — integrando E02-S03/04/06
```

### AC-3: Fase bloqueada não é acionável
```gherkin
Given  uma fase bloqueada (admin ainda não liberou)
When   tento abri-la/agir
Then   ela aparece com cadeado e mensagem "Disponível após liberação do seu case manager"
And    nenhuma ação da fase bloqueada é executável
```

### AC-4: Desbloqueio pelo gate do admin
```gherkin
Given  a fase atual concluída e o admin executa "liberar próxima fase" (E03-S03)
When   volto à jornada (mesmo mock db)
Then   a próxima fase muda de bloqueada para liberada
And    a gamificação reflete o avanço (progresso/badge)
```

### AC-5: Conclusão de etapa avança progresso
```gherkin
Given  uma etapa pendente de uma fase liberada
When   concluo a etapa (ação mock)
Then   o progresso da fase e da jornada aumenta
And    quando todas as etapas da fase concluem, a fase fica "concluída" (aguardando liberação da próxima)
```

### AC-6: i18n + impeccable
```gherkin
Given  a jornada
When   troco idioma / avalio design
Then   traduz; a experiência é elegante e claramente gamificada; impeccable passa
```

## Out of Scope
- A ação do admin de liberar (é E03-S03; aqui consumimos o resultado).
- Implementação de upload/assinatura/pagamento em si (E02-S03/04/05) — a jornada apenas os integra.

## Notas
- Regra do gate central (ver design de E00-S04). Status de fase: `bloqueada|liberada|em_andamento|concluida`.
- Gamificação: trilha visual, badges por fase, microcopy motivacional. Respeitar reduced-motion.
- Feature `jornada`.
