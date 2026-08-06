# Checklist Impeccable — Painel Admin completo (E03-S01/S02/S03/S04/S05)

Checklist consolidado — as 5 telas do admin seguem o padrão navy-950 sidebar já estabelecido em E00-S05.

## 1. Spacing & Alignment
- [x] Kanban: colunas com largura fixa (w-72), scroll horizontal, gap-4 entre colunas
- [x] Cliente 360: header (avatar+nome+badge) → Tabs → conteúdo, hierarquia vertical clara
- [x] Dashboard: grid 2 colunas em telas grandes, cards com padding consistente

## 2. Typography
- [x] Padrão title Fraunces + subtitle mantido nas 5 páginas
- [x] Dashboard: números grandes (font-display text-2xl) para métricas-chave, labels pequenos uppercase

## 3. Color & Contrast
- [x] Kanban: cards com shadow-subtle→shadow-elevated no hover (affordance de arrastar)
- [x] Saúde do caso: status reservado (em_dia=success/verde, atencao=warning/amber,
  atrasado=danger/vermelho) — cores reservadas, nunca reusadas para outra coisa (seguindo dataviz skill)
- [x] Dashboard: barras em navy sólido (magnitude de uma única série — hue único, não arco-íris);
  receita com dots coloridos por status (não texto colorido — texto permanece em ink tokens)

## 4. Interaction & Animation
- [x] Kanban: drag-and-drop nativo (HTML5) + alternativa acessível via Select "Mover para"
  no modal de detalhe (AC-5: drag-drop acessível por teclado)
- [x] Cliente 360: Tabs com transição de cor suave, gestão de jornada com modal de confirmação
  (mostra aviso se fase atual não concluída, sem bloquear a ação — decisão do admin)
- [x] Barras do dashboard com transição de largura (500ms ease-out-soft, mesmo padrão do Progress)

## 5. Consistency & Details
- [x] Reusa Tabs/Stepper/Modal/Badge/Card do design system em todas as 5 páginas
- [x] Ícones únicos (lucide): MessageCircle (conversas), demais herdados do design system

## Dataviz (E03-S05)
- [x] Skill dataviz consultada antes de construir gráficos
- [x] Um eixo por gráfico (sem dual-axis)
- [x] Funil/clientes-por-fase: hue único (navy) para magnitude — não é comparação de identidades,
  é progressão de um único funil/jornada, então sequential (1 hue) é correto, não categórico
- [x] Saúde dos casos: paleta de status reservada (não genérica/categórica)
- [x] Texto sempre em ink tokens, nunca a cor da série (labels e valores em cinza/navy, só o
  indicador visual — barra ou dot — carrega a cor)
- [x] Tooltip via title attribute nas barras (hover mínimo viável para protótipo)

## Extensões de arquitetura (documentadas)
- `ClienteRepository.atualizar()` (já documentado em E02-S07) reutilizado aqui implicitamente
- Novo hook `comunicacao/application/hooks.ts` (useConversaCliente, useConversas) — reativo,
  mesmo padrão dos demais hooks pós-correção de E02-S03

## Peer Review
- [ ] Revisão visual em browser real — pendente (extensão Chrome indisponível nesta sessão)

## Gate executável
- 4 novos testes em `mocks/admin-actions.test.ts`: moverEstagio, conversão lead→cliente
  (cria jornada com fase-0 liberada), gate de liberarFase + histórico, ciclo de vida de proposta
  (rascunho→enviada→aceita). Total 32 testes, todos verdes. Fecha o épico E03 (painel admin) por completo.
