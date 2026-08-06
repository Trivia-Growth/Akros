---
name: SPEC
description: Qualificação conversacional no WhatsApp — as perguntas do formulário feitas em conversa, sem link externo.
story: E11-S01
tier: pequeno
alwaysApply: false
---

# SPEC — Qualificação conversacional no WhatsApp (E11-S01)

## User Story
Como **lead**, quero **responder as perguntas da Akros na própria conversa**, para que **eu não
precise abrir um formulário fora do WhatsApp para começar**.

## Contexto
Hoje o fluxo é: o lead chama no WhatsApp, o Bruno se apresenta e manda o link de um formulário de
~10 perguntas. O link é onde muita gente cai fora — não por falta de interesse, mas por atrito.

Restrição de produto que a Akros colocou e que **é parte do requisito**: reduzir fricção **sem**
transformar o processo em algo tão automático que o lead não precise demonstrar comprometimento.
Imigração é decisão de vida; um lead que não responde 10 perguntas provavelmente não vai reunir
40 documentos. A conversa é um filtro legítimo — deve ser fluida, não indolor.

## Acceptance Criteria

### AC-1: Perguntas em conversa, uma de cada vez
```gherkin
Given  um lead novo no WhatsApp
When   a qualificação começa
Then   o bot se apresenta como assistente e diz quantas perguntas serão
And    faz uma pergunta por vez, aguardando a resposta antes da próxima
And    o lead pode pedir para receber o link do formulário, se preferir
```

### AC-2: Resposta livre é entendida
```gherkin
Given  uma pergunta de múltipla escolha
When   o lead responde com texto livre em vez da opção
Then   a resposta é interpretada e mapeada para a opção correspondente
And    quando ambígua, o bot confirma o entendimento em vez de assumir
```

### AC-3: Retomada sem recomeço
```gherkin
Given  um lead que respondeu 4 de 10 perguntas e parou
When   ele volta dias depois
Then   a conversa retoma da quinta pergunta
And    as respostas anteriores estão preservadas
```

### AC-4: Perfil é montado ao longo da conversa
```gherkin
Given  respostas coletadas
When   olho o lead no kanban
Then   vejo o perfil preenchido progressivamente (E11-S02)
And    vejo o percentual de qualificação concluído
```

### AC-5: Dúvida do lead não descarrilha o fluxo
```gherkin
Given  que o lead pergunta algo no meio da qualificação
When   o tópico é conhecido pelo agente (E04-S02)
Then   ele responde e retoma de onde parou
And    quando não é, faz handoff para humano sem perder as respostas já dadas
```

### AC-6: Tudo na timeline
```gherkin
Given  a conversa de qualificação
When   o admin abre o lead
Then   vê a conversa completa na timeline unificada (E08-S01)
```

### AC-7: i18n + impeccable
```gherkin
Given  a simulação da conversa no admin
When   troco idioma / avalio design
Then   traduz; a simulação segue o design system; impeccable passa
```

## Out of Scope
- Integração real com WhatsApp API oficial / Evolution — nesta fase é simulação.
- A decisão de qualificar ou não (isso é humano — E11-S04).

## Roteiro mockado (fictício — dá o norte de como vai ficar, não é o formulário final)
Sem acesso ao formulário real da Akros nesta rodada. O roteiro abaixo é **fixture de
demonstração**, para provar o mecanismo (uma pergunta por vez, retomada, mapeamento de resposta
livre). Substituir pelo roteiro real antes de qualquer uso com lead de verdade.

```ts
export const roteiroQualificacaoMock: PerguntaRoteiro[] = [
  { id: "nome", texto: "Antes de começar, qual o seu nome completo?", campo: "nome", tipo: "texto" },
  { id: "formacao", texto: "Qual seu nível de formação?", campo: "formacao", tipo: "opcoes",
    opcoes: ["medio", "superior", "pos", "mestrado", "doutorado"] },
  { id: "area", texto: "Em que área você atua profissionalmente?", campo: "areaAtuacao", tipo: "texto" },
  { id: "anos_exp", texto: "Quantos anos de experiência você tem nessa área?", campo: "anosExperiencia", tipo: "numero" },
  { id: "visto_interesse", texto: "Você já tem um visto em mente ou quer que a gente indique o melhor caminho?",
    campo: "tipoVistoInteresse", tipo: "opcoes", opcoes: ["eb2-niw", "eb1", "religioso", "nao_sei"] },
  { id: "esta_eua", texto: "Você já está nos Estados Unidos ou ainda no Brasil?", campo: "estaNosEUA", tipo: "sim_nao" },
  { id: "familia", texto: "Pretende levar cônjuge e/ou filhos no processo?", campo: "familia", tipo: "texto" },
  { id: "prazo", texto: "Você tem algum prazo em mente para iniciar a mudança?", campo: "prazoDesejado", tipo: "texto" },
  { id: "budget", texto: "Para eu te indicar a melhor opção, qual faixa de investimento você tem em mente hoje?",
    campo: "faixaBudget", tipo: "opcoes", opcoes: ["ate_15k", "15k_30k", "30k_50k", "acima_50k", "prefiro_nao_informar"] },
  { id: "momento", texto: "Você já decidiu seguir com a imigração ou ainda está pesquisando?",
    campo: "momentoVida", tipo: "opcoes", opcoes: ["explorando", "decidido_sem_prazo", "decidido_com_prazo", "urgente"] },
];
```

## Notas de implementação
- Estende `RegraAtendimentoIA` (E04-S02) com um roteiro de qualificação com estado.
- **O roteiro acima é fictício e mockado de propósito** — existe para dar o norte de como o
  produto final vai se comportar (uma pergunta por vez, retomada, perfil sendo montado). Pedir o
  roteiro real da Akros antes de qualquer uso fora de demo; marcar isso como pendência no PR.
- AC-1 mantém o link disponível de propósito: o objetivo é remover atrito, não remover escolha.
