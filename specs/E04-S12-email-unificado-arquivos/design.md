---
name: DESIGN
description: Conta Google/Microsoft com escopos (agenda/e-mail/arquivos), inbox de e-mail unificado na timeline e selo de armazenamento em nuvem por documento.
story: E04-S12
alwaysApply: false
---

# DESIGN — E-mail unificado + armazenamento em nuvem (E04-S12)

Tier **arquitetural**: generaliza a entidade de conta conectada (E04-S07) pra cobrir mais de um
escopo, e introduz um canal de comunicação novo com modelo de compartilhamento entre usuários —
que hoje não existe em nenhuma feature da Akros.

## Contexto

Pedido do Bruno: clientes também falam por e-mail (Microsoft/Google), e isso precisa aparecer na
mesma visão 360 que já mostra WhatsApp. A conexão deve ser fácil (reaproveitar o OAuth que já
existe pra agenda), e algumas caixas são pessoais (cada consultor vê a sua) enquanto outras são
compartilhadas (ex.: `faleconosco@`, vista por várias pessoas específicas). Os arquivos que o
cliente envia devem ficar arquivados numa pasta corporativa única do OneDrive/Drive.

## Decisão de design: uma conta, vários escopos

`ContaAgendaConectada` (E04-S07) virou `ContaConectada` com um campo novo `escopos: EscopoConta[]`
(`"agenda" | "email" | "arquivos"`). Reflete o OAuth real: um único consentimento Google/Microsoft
cobre Calendar + Mail + Drive/Graph Files. Calendly continua só `["agenda"]` (não tem e-mail nem
Drive). Isso evita duplicar o fluxo de "conectar conta" três vezes — o admin conecta uma vez e
marca o que aquela conta autoriza.

```ts
export type EscopoConta = "agenda" | "email" | "arquivos";

export interface ContaConectada {
  id: string;
  provedor: ProvedorAgenda; // "google" | "microsoft" | "calendly"
  nomeExibicao: string;
  ativa: boolean;
  conectadoEm: string;
  credenciais: CredenciaisContaAgenda;
  escopos: EscopoConta[];
  donoId: string;                    // UsuarioAkros — só ele vê por padrão
  emailEndereco?: string;            // presente quando escopos inclui "email"
  compartilhadoComIds?: string[];    // UsuarioAkros[] — lista granular de quem mais vê
  pastaRaiz?: string;                // presente quando escopos inclui "arquivos"
}
```

`UsuarioAkros` (novo, `features/configuracoes/domain/types.ts`) é o time interno — hoje só Bruno,
Natalia, Denise e Elem (fixtures reais, fotos de `public/equipe/`). **Não existe sessão/usuário
logado nesta fase do protótipo** — o compartilhamento é um dado exibido (quem pode ver, segundo o
modelo), não um controle de acesso de fato aplicado, porque não há autenticação real ainda. Isso é
uma limitação conhecida, não um bug: quando o backend real existir (Supabase Auth), o filtro por
usuário logado vira trivial em cima deste mesmo campo.

## E-mail como canal — mesmo padrão do WhatsApp

`EmailThread`/`EmailMensagem` (novo, `features/comunicacao/domain/types.ts`) tem storage próprio,
como `Conversa`/`Mensagem` do WhatsApp (E04-S01) — **não** vira `EventoComunicacao` gravado; a
timeline funde na leitura (`useTimeline`, já preparado pro canal `"email"` desde o E08-S01).

```ts
export interface EmailThread {
  id: string;
  contaEmailId: string;          // ContaConectada com escopo "email"
  clienteOuLeadId?: string;      // ausente = e-mail "não vinculado" (mesmo princípio do E07-S01)
  clienteNome?: string;
  assunto: string;
  mensagens: EmailMensagem[];
}
```

Vinculação ao cliente é por correspondência de e-mail nas fixtures (mock). Sem correspondência, o
thread aparece na inbox marcado "Sem cliente vinculado" — não é perdido.

## UI de leitura é e-mail, não mensageria

A aba E-mail (`EmailInbox`/`EmailThreadPane`) **não** usa bolhas de chat alinhadas
esquerda/direita como o inbox de WhatsApp — cada mensagem da thread é um cartão com cabeçalho
próprio (remetente, endereço, data), empilhado de cima pra baixo, igual à conversação do
Gmail/Outlook. O compositor de resposta mostra "Para"/"Assunto" como um e-mail de verdade mostra,
não um campo de texto único de chat.

## Viabilidade de API real (pergunta do Bruno)

**Sim, é tecnicamente viável** ler e enviar e-mail com as APIs oficiais, quando o produto sair do
protótipo mockado:

- **Microsoft Graph** (`GET /me/mailFolders/inbox/messages`, `POST /me/sendMail`) — mesma conta
  OAuth que já cobre Calendar (E04-S07), só precisa do escopo `Mail.ReadWrite`/`Mail.Send` a mais.
- **Gmail API** (`users.messages.list`/`users.messages.send`) — mesma lógica, escopo
  `gmail.readonly`/`gmail.send`.

**Mas exige backend.** Refresh token de e-mail é tão sensível quanto o de calendário — não pode
viver no navegador. Isso significa Edge Function (Supabase) fazendo o polling/webhook e guardando
o token no Vault, igual ao padrão já usado pra outras integrações (`seguranca/os-grade.md`). Webhook
em tempo real (Microsoft Graph change notifications / Gmail push via Pub/Sub) é o caminho certo em
vez de polling, mas é trabalho novo, não reaproveita nada desta rodada além do modelo de dados.
Fica registrado como decisão de arquitetura pra quando a fase mockada acabar — não é algo pra
resolver nesta rodada de protótipo.

## UI

- **Configurações → Contas conectadas**: cada conta lista seus escopos como badges. Contas com
  escopo `email` mostram o endereço e um editor de compartilhamento (avatares + checklist do
  time). Contas com escopo `arquivos` mostram a pasta raiz.
- **Comunicação → aba E-mail** (nova, ao lado de Inbox/Agente IA/Base de conhecimento): lista de
  threads com indicação de qual caixa recebeu, badge de cliente vinculado (ou aviso), e resposta
  inline (`enviarEmailThread`, mesmo padrão de `enviarMensagemConversa`).
- **Fila de revisão de documentos**: cada documento mostra `<pastaRaiz>/<cliente>/<documento>` —
  selo textual, não link real (sem storage de binário nesta fase, mesma regra do E02-S03).
- **Ferramenta de agendamento do agente** (E04-S07): filtro ajustado pra só listar contas com
  escopo `"agenda"` — contas só-e-mail ou só-arquivos não aparecem lá.

## Fora de escopo desta rodada (registrado)

- OAuth real (Microsoft Graph / Google API) — credenciais continuam mascaradas/mock.
- Upload/leitura de binário real no OneDrive/Drive — o selo é só o caminho computado.
- Controle de acesso de fato (não existe usuário logado no protótipo ainda).
- Webhook de e-mail recebido em tempo real — os threads são fixture estática.

## Riscos

| Risco | Prob. × Impacto | Mitigação |
|---|---|---|
| Confundir "conta com escopo email" com controle de acesso real | média × médio | Nota explícita no design e na UI de que compartilhamento é declarativo até existir auth real |
| Renomear `ContaAgendaConectada` quebrar consumidor esquecido | baixa × médio | `pnpm typecheck` cobre 100% dos usos — rodado e verde antes de considerar a story pronta |
| PII de e-mail (conteúdo de cliente) num provedor de IA futuro | média × alto | Mesma nota já registrada no ADR-0005 pra documentos — vale igual pra e-mail quando o adapter real existir |
