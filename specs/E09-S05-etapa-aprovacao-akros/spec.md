---
name: SPEC
description: Cliente envia etapa (pendente → em_analise); só a Akros aprova (concluida, com notificação) ou devolve pra ajuste.
story: E09-S05
tier: pequeno
alwaysApply: false
---

# SPEC — Cliente não conclui etapa sozinho (E09-S05)

## User Story
Como **Akros**, quero **que o cliente só envie informações/documentos, nunca marque uma etapa
como concluída sozinho** — a conclusão é sempre uma decisão da equipe, notificada ao cliente
quando acontece.

## Contexto
`JornadaPage.tsx` (portal) deixava o cliente chamar `concluirEtapa`, fechando a etapa (e às vezes
a fase inteira) sem nenhuma revisão humana — o mesmo princípio de "IA nunca decide sozinha"
(ADR-0005) devia valer aqui pro cliente, e não valia. Corrigido reaproveitando o padrão já usado
pra documentos (`Documento.status: em_analise`, decisão humana em `FilaRevisaoPage`).

## Acceptance Criteria

### AC-1: Cliente envia, não conclui
```gherkin
Given uma etapa "pendente" no portal do cliente
When o cliente clica em "Enviar para avaliação"
Then o status da etapa vira "em_analise" — nunca "concluida" diretamente
And o cliente vê o badge "Aguardando avaliação da Akros"
```

### AC-2: Só a Akros aprova
```gherkin
Given uma etapa "em_analise", no Cliente 360 → aba Jornada → painel "Aguardando sua avaliação"
When o admin clica em "Aprovar"
Then o status vira "concluida"
And se essa era a última etapa pendente da fase, a fase vira "concluida" também
And um evento de sistema é registrado, virando notificação pro cliente em /portal
```

### AC-3: Akros pode devolver para ajuste
```gherkin
Given uma etapa "em_analise"
When o admin clica em "Devolver p/ ajuste" e escreve o motivo
Then o status volta pra "pendente" (cliente reenvia)
And o motivo fica registrado no evento de sistema — o cliente vê o que precisa corrigir
```

### AC-4: Progresso só conta o que a Akros aprovou
```gherkin
Given etapas em diferentes status (pendente, em_analise, concluida)
When calculo o progresso da jornada
Then só etapas "concluida" contam — "em_analise" não infla o percentual
```

## Out of Scope
- Aprovação em massa (uma etapa por vez, decisão explícita — mesmo princípio do E07-S03).
- Notificação por e-mail/push real — fica no `NotificationCenter` do portal (mock), igual ao
  resto do produto.

## Notas de implementação
- Rename: `JornadaRepository.concluirEtapa` → `enviarEtapaParaAvaliacao` (cliente) +
  `aprovarEtapa`/`devolverEtapaParaAjuste` (admin) — em `ports.ts`, `MockJornadaRepository`,
  `application/hooks.ts`, `mocks/store.ts`.
- Notificação no portal: `PortalLayout.tsx` já filtrava `eventosComunicacao` por substring pra
  virar notificação (mesmo padrão do "fase liberada") — dois filtros novos, por "aprovada" e por
  "devolvida para ajustes".
