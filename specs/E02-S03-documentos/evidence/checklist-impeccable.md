---
name: checklist-impeccable-E02-S03-documentos-evidence
description: Checklist impeccable preenchido para a story.
alwaysApply: false
---

# Checklist Impeccable — Documentos, Assinatura, Pagamentos, Agenda, Perfil (E02-S03/S04/S05/S06/S07)

Checklist consolidado — as 5 telas seguem o mesmo padrão visual do portal (E02-S01/S02).

## 1. Spacing & Alignment
- [x] Listas de itens (documentos/pagamentos/reuniões) em Cards com padding consistente,
  gap-3 entre itens — mesmo ritmo visual em toda a área do portal

## 2. Typography
- [x] Título Fraunces + subtítulo em todas as 5 páginas (padrão herdado)
- [x] Regras de envio de documentos como lista compacta (não bloco de texto corrido)

## 3. Color & Contrast
- [x] Documentos: 5 status mapeados a badges com cor semântica (pendente=neutral,
  enviado=navy, em_analise=gold, aprovado=success, ajustes=warning)
- [x] Pagamentos: atrasado=danger (vermelho), pendente=gold, pago=success — hierarquia de urgência clara

## 4. Interaction & Animation
- [x] Upload/assinatura/pagamento/agendamento: todos com estado loading nativo do Button +
  proteção duplo-clique (`if (submitting) return` / disabled durante ação)
- [x] Modal de assinatura e de agendamento reusam o componente Modal (foco gerenciado, Escape, backdrop)

## 5. Consistency & Details
- [x] **Bug corrigido durante a implementação:** hooks de documentos/pagamentos/agenda inicialmente
  usavam fetch assíncrono via container (padrão de site/hooks.ts), o que não refletia mutações
  em tempo real na UI. Refatorados para leitura reativa direto do useMockDb (mesmo padrão de
  jornada/hooks.ts) — mutações (upload, assinatura, pagamento, agendamento) agora atualizam a
  tela imediatamente sem necessidade de refetch manual.
- [x] Perfil: campos somente-leitura (tipo de visto, case manager) visualmente diferenciados
  (disabled) dos campos editáveis

## Extensão de porta (documentada)
- `ClienteRepository.atualizar()` adicionado ao port (não previsto em E00-S04) para satisfazer
  E02-S07 AC-2 (edição de perfil persiste na sessão). Store + MockClienteRepository atualizados
  em conjunto — mudança pequena e coerente com o padrão de portas/adapters já estabelecido.

## Peer Review
- [ ] Revisão visual em browser real — pendente (extensão Chrome indisponível nesta sessão)

## Gate executável
- 5 novos testes em `mocks/portal-actions.test.ts` cobrindo AC-2 de cada story (registrarEnvio,
  assinar, marcarComoPago, agendar, atualizar cliente) — todos verdes. Total 28 testes (regressão
  completa incluída).
