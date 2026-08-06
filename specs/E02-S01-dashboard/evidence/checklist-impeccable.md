---
name: checklist-impeccable-E02-S01-dashboard-evidence
description: Checklist impeccable preenchido para a story.
alwaysApply: false
---

# Checklist Impeccable — Dashboard do Cliente (E02-S01)

## 1. Spacing & Alignment
- [x] Cards com gap-8 entre blocos (jornada / ações / atalhos), gap-4 entre atalhos — hierarquia por proximidade
- [x] Grid de atalhos responsivo (1 col mobile → 3 col desktop)

## 2. Typography
- [x] Saudação em Fraunces (display), demais textos em Inter — consistente com HomePage
- [x] Labels de atalho uppercase pequeno, valor em peso médio — hierarquia clara

## 3. Color & Contrast
- [x] Estados de alerta (documentos pendentes, pagamento atrasado) em vermelho — só quando há problema real
- [x] Badge gold para "pendente" nas próximas ações (chama atenção sem ser alarmante)

## 4. Interaction & Animation
- [x] Cards de atalho com hover:shadow-elevated (feedback de clicável)
- [x] Ações da lista com hover border/bg gold sutil

## 5. Consistency & Details
- [x] Reusa Stepper/Progress/Card/Badge do design system — nenhum componente novo criado aqui
- [x] Ícones únicos (lucide): FileText, Wallet, CalendarDays

## Dados reais por cenário (AC-4)
- [x] Testado via personas: Carlos (Fase 1 em andamento, docs pendentes), Renata (pagamento
  atrasado visível em vermelho), Fernanda (jornada 100%, sem ações pendentes)

## Peer Review
- [ ] Revisão visual em browser real — pendente (extensão Chrome indisponível nesta sessão)

## Gate executável
- Reutiliza os 5 testes de `jornada/application/hooks.test.ts` (calcularProgresso, obterFaseAtual)
  que alimentam diretamente o dashboard.
