# Checklist Impeccable — Jornada Gamificada (E02-S02)

## 1. Spacing & Alignment
- [x] Stepper horizontal com scroll interno em telas pequenas (overflow-x-auto) — não quebra layout
- [x] Etapas em cards com padding consistente, gap-3 entre elas

## 2. Typography
- [x] Título da fase em Fraunces, descrição/etapas em Inter corpo — hierarquia clara
- [x] "Documentos necessários" como label pequeno uppercase antes da lista

## 3. Color & Contrast
- [x] 4 status da fase com badge de cor distinta: concluída (verde/success), em andamento
  (gold), liberada (navy), bloqueada (neutral/cinza) — mapeamento semântico correto
- [x] Fase bloqueada com fundo cream neutro (não é erro, é apenas "ainda não" — tom calmo)

## 4. Interaction & Animation
- [x] Stepper: fases bloqueadas não clicáveis (cursor-not-allowed), liberadas/concluídas clicáveis
- [x] Progress bar com transição suave (herdada do design system, 500ms ease-out-soft)
- [x] Botão "Marcar como concluída" -> feedback via toast + badge muda para "Concluída" (re-render reativo)

## 5. Consistency & Details
- [x] Stepper reutiliza exatamente os 4 status definidos no domínio (StepStatus === FaseStatus,
  sem mapeamento/tradução de tipos)
- [x] Ícone de cadeado (Lock) consistente com o Stepper (mesmo ícone em ambos os lugares)

## Gamificação (requisito central da spec)
- [x] Trilha visual clara com 6 nós conectados (Introdução + 5 fases)
- [x] Unlock sequencial: fase bloqueada mostra cadeado + mensagem, zero ações possíveis
  (verificado por teste: fase-2 permanece bloqueada até liberarFase ser chamado pelo admin)
- [x] Progresso visível em dois níveis: barra geral (%) + status por fase no stepper

## Peer Review
- [ ] Revisão visual em browser real — pendente (extensão Chrome indisponível nesta sessão)

## Gate executável
- 5 testes vitest: obterFaseAtual, calcularProgresso (parcial e 100%), concluirEtapa avança
  progresso, fase completa quando todas etapas concluem, fase-2 bloqueada até liberação —
  todos verdes. Cobre exatamente a regra central do produto (unlock sequencial).
