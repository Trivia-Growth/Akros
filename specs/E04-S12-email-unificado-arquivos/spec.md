---
name: SPEC
description: Contrato do e-mail unificado (Google/Microsoft), compartilhamento de caixa entre usuários e selo de pasta OneDrive/Drive por documento.
story: E04-S12
tier: arquitetural
alwaysApply: false
---

# SPEC — E-mail unificado + armazenamento em nuvem (E04-S12)

## User Story
Como **admin/case manager**, quero **ver os e-mails trocados com o cliente na mesma visão que já
mostra WhatsApp**, **conectar minha conta Google/Microsoft de forma fácil (e compartilhar caixas
como `faleconosco@` com colegas específicos)**, e **saber que os arquivos que o cliente envia ficam
guardados numa pasta única do OneDrive/Drive**, para que **nenhum canal de contato fique fora do
produto**.

## Contexto
Depende de `E04-S07` (contas conectadas), `E08-S01` (timeline unificada — canal `"email"` já
existia no tipo, sem dado real atrás) e `E02-S03`/`E07-S01` (documentos). Ver `design.md`.

## Acceptance Criteria

### AC-1: Uma conta, múltiplos escopos
```gherkin
Given o formulário de "Conectar conta" em /admin/configuracoes
When escolho Google ou Microsoft
Then posso marcar um ou mais escopos: Agenda, E-mail, Arquivos
And cada escopo revela os campos que precisa (endereço de e-mail; pasta raiz)
And Calendly continua limitado ao escopo Agenda, sem os checkboxes
```

### AC-2: E-mail aparece na timeline do cliente
```gherkin
Given um cliente com e-mails trocados numa conta conectada com escopo "email"
When abro a timeline dele (visão 360 ou lead)
Then os e-mails aparecem no mesmo fluxo cronológico do WhatsApp, com ícone e rótulo de canal
And o conteúdo mostra assunto e corpo, e anexo (quando houver) aparece referenciado
```

### AC-3: Inbox de e-mail dedicado
```gherkin
Given a aba "E-mail" em /admin/comunicacao
When abro um e-mail da lista
Then vejo a thread completa, de qual conta ele chegou, e se está vinculado a um cliente
And consigo responder, e a resposta aparece na thread e na timeline do cliente
```

### AC-4: E-mail sem cliente correspondente não é perdido
```gherkin
Given um e-mail recebido de um remetente que não casa com nenhum cliente/lead cadastrado
When ele chega
Then aparece na aba E-mail marcado "Sem cliente vinculado"
And continua visível e respondível, só não aparece em nenhuma timeline de cliente
```

### AC-5: Compartilhamento granular de caixa de e-mail
```gherkin
Given uma conta com escopo "email" (ex.: Recepção — faleconosco@)
When o dono gerencia o compartilhamento
Then escolhe pessoa por pessoa (do time Akros) quem mais enxerga aquela caixa
And sem ninguém marcado, a conta aparece como "Privada — só <dono> vê"
```

### AC-6: Selo de armazenamento em nuvem no documento
```gherkin
Given uma conta ativa com escopo "arquivos" e sua pasta raiz configurada
When abro um documento na fila de revisão
Then vejo o caminho onde ele fica arquivado (pasta raiz + nome do cliente + nome do documento)
And sem conta de arquivos ativa, o selo simplesmente não aparece — não quebra a tela
```

### AC-7: Ferramenta de agendamento não lista contas fora de escopo
```gherkin
Given contas conectadas com diferentes combinações de escopo
When abro Agente IA → Ferramenta de agendamento
Then só vejo, pra selecionar, as contas cujo escopo inclui "agenda"
```

### AC-8: Regressão zero no que já existia
```gherkin
Given o comportamento de agenda (E04-S07) antes desta story
When rodo os testes e a demo de agendamento do agente
Then nada muda — a generalização de ContaAgendaConectada pra ContaConectada é transparente
```

## Out of Scope
- OAuth real, upload/leitura de binário real, controle de acesso de fato (sem usuário logado
  nesta fase) — ver `design.md`.
- Webhook de e-mail em tempo real — threads são fixture estática nesta rodada.

## Notas de implementação
- `pnpm typecheck` é o gate principal do rename `ContaAgendaConectada` → `ContaConectada` — cobre
  os 4 consumidores existentes (store, ComunicacaoPage, ConfiguracoesPage).
- Time interno (`UsuarioAkros`) usa os 4 nomes/fotos reais já publicados no site
  (`public/equipe/`) — não inventar pessoas novas.
