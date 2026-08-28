---
name: SPEC
description: Cliente 360 ganha pasta de Drive por fase, cadastro de fluxo de pagamento, conversas unificadas e documentos com caminho; lead ganha reuniões/proposta; conversão preserva tudo.
story: E04-S13
tier: pequeno
alwaysApply: false
---

# SPEC — Cliente 360: pasta por fase, pagamentos, conversas e leads (E04-S13)

## User Story
Como **admin/case manager**, quero **configurar onde os documentos de um cliente são salvos,
cadastrar como ele vai pagar, ver toda conversa (WhatsApp + e-mail) num lugar e não perder nada
quando um lead vira cliente**, para que **a visão 360 seja completa de verdade**.

## Contexto
Estende `E06-S01` (jornada/fases), `E10-S01` (pagamentos), `E04-S12` (e-mail/arquivos) e
`E08-S01` (timeline). Sem decisão arquitetural nova — reaproveita `atualizarCliente`,
`useTimeline`, e o padrão de ação do store (`criarPagamento` segue `marcarPagamentoComoPago`).

## Acceptance Criteria

### AC-1: Pasta do cliente com subpasta por fase
```gherkin
Given a aba "Dados" do Cliente 360, com uma conta de arquivos ativa em Configurações
When o admin define o nome da pasta do cliente (ou deixa em branco = nome do cliente)
Then documentos desse cliente passam a mostrar
     "<pasta raiz>/<pasta do cliente>/<fase em que foi carregado>/<nome do documento>"
```

### AC-2: Cadastrar fluxo de pagamento
```gherkin
Given a aba "Pagamentos" do Cliente 360
When o admin cadastra um item (descrição, tipo, valor, moeda, vencimento)
Then ele aparece na lista com status "pendente", e segue o fluxo de conciliação já existente
     (E10-S01) normalmente
```

### AC-3: Conversas mostram WhatsApp e e-mail juntos
```gherkin
Given um cliente com mensagens de WhatsApp e threads de e-mail
When abro a aba "Conversas"
Then vejo os dois canais no mesmo feed cronológico, cada um com ícone e rótulo do canal
```

### AC-4: Documentos mostram onde estão salvos
```gherkin
Given a aba "Documentos" do Cliente 360
When um documento já tem fase e conta de arquivos ativa
Then vejo o caminho da pasta abaixo do nome do documento
```

### AC-5: Lead tem reuniões e proposta visíveis
```gherkin
Given o detalhe de um lead com reunião agendada e/ou proposta enviada
When abro as abas "Reuniões" e "Proposta"
Then vejo a lista de reuniões e a(s) proposta(s) vinculadas a esse lead
```

### AC-6: Conversão lead→cliente não perde histórico
```gherkin
Given um lead com conversas, e-mails, reuniões e proposta registrados
When ele é convertido em cliente (ganha um id novo — ADR não muda isso)
Then toda essa história aparece na visão 360 do cliente novo, sem duplicar e sem sumir
```

## Out of Scope
- Editor de fase/etapa em si (fora, já coberto por E06).
- Gateway de pagamento — cadastro aqui é só o plano, cobrança continua manual (E10-S01).

## Notas de implementação
- AC-6 corrige um bug real: `criarClienteAPartirDeLead` criava `Cliente.id` novo mas não
  reparentava `eventosComunicacao`/`conversas`/`emailThreads`/`reunioes`/`propostas` — ficavam
  presos no `leadId` antigo e desapareciam da visão do cliente. Corrigido na própria ação.
