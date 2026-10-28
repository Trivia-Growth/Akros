---
name: DESIGN
description: Contas de agenda conectadas (Google/Microsoft/Calendly) + tool de agendamento do agente de IA.
story: E04-S07
alwaysApply: false
---

# DESIGN — Tool de agenda do agente (E04-S07)

Tier **arquitetural** (ADR-0007). Integração externa nova (3 provedores) + exceção consciente ao
princípio de humano no loop — ver ADR-0007 para o porquê e os limites da exceção.

## Princípio que governa o desenho
A tool só existe pro agente depois de **duas autorizações humanas explícitas e separadas**:
conectar a conta de calendário (`configuracoes`) e ativar a tool + escolher as contas (`comunicacao`
→ Agente IA). Nenhuma reunião nasce sem essas duas coisas já terem acontecido, e toda reunião criada
pela tool carrega `criadaPor: "agente_ia"` — auditável, nunca silenciosa.

## Tipos — `features/configuracoes/domain/types.ts`

```ts
export type ProvedorAgenda = "google" | "microsoft" | "calendly";

export interface CredenciaisGoogleCalendar {
  clientId: string;
  clientSecretConfigurado: boolean;
  clientSecretFinal?: string;
  refreshTokenConfigurado: boolean;
  refreshTokenFinal?: string;
  calendarId: string;
}

export interface CredenciaisMicrosoftCalendar {
  clientId: string;
  clientSecretConfigurado: boolean;
  clientSecretFinal?: string;
  tenantId: string;
  refreshTokenConfigurado: boolean;
  refreshTokenFinal?: string;
}

/** Campos conforme developer.calendly.com/getting-started (Personal Access Token). */
export interface CredenciaisCalendly {
  personalAccessTokenConfigurado: boolean;
  personalAccessTokenFinal?: string;
  organizationUri: string;
  eventTypeUri: string;
}

export type CredenciaisContaAgenda =
  | { provedor: "google"; dados: CredenciaisGoogleCalendar }
  | { provedor: "microsoft"; dados: CredenciaisMicrosoftCalendar }
  | { provedor: "calendly"; dados: CredenciaisCalendly };

export interface ContaAgendaConectada {
  id: string;
  provedor: ProvedorAgenda;
  nomeExibicao: string; // ex.: "Bruno Luz — Google Calendar"
  ativa: boolean;
  conectadoEm: string;
  credenciais: CredenciaisContaAgenda;
}
```

Lista dinâmica (`ContaAgendaConectada[]`), não um catálogo fixo como `IntegracaoExterna` — várias
contas por provedor são permitidas (ex.: 2 contas Google de pessoas diferentes).

## Tipos — `features/agenda/domain/types.ts`

```ts
export interface Reuniao {
  // ...campos atuais
  criadaPor?: "cliente" | "admin" | "agente_ia";
}
```

Sem campo = comportamento atual (reuniões existentes não precisam de migração).

## Tipos — `features/comunicacao/domain/types.ts`

```ts
export interface FerramentaAgendamento {
  ativa: boolean;
  contasAgendaIds: string[]; // ids de ContaAgendaConectada que este agente pode usar
}

export interface RegraAtendimentoIA {
  // ...campos atuais
  ferramentaAgendamento?: FerramentaAgendamento;
}
```

Decoupling deliberado: `comunicacao` referencia só `string` ids de conta, não importa tipos de
`configuracoes` — mesmo padrão já usado para não acoplar `CanalComunicacao` a `IntegracaoExterna`
(E04-S06). A UI é quem junta as duas listas via `useMockDb`.

## Telas

**`/admin/configuracoes`** — nova seção "Contas de agenda conectadas": grid de cards por conta
(provedor, nome de exibição, ativa/inativa, "editar"/"desconectar"), botão "Conectar conta" abre
modal — primeiro escolhe o provedor, depois mostra o formulário específico daquele provedor
(mesmo padrão do formulário Meta em E04-S06: campos sensíveis mascarados nos últimos 4 caracteres).

**`/admin/comunicacao` → aba Agente IA** — novo card "Ferramenta de agendamento": toggle ativa/
desativa; lista as `ContaAgendaConectada` com `ativa: true` como checkboxes — o admin escolhe quais
esse agente específico pode usar. Sem nenhuma conta conectada, o card mostra estado vazio
apontando para `/admin/configuracoes`.

## Simulação da conversa (Inbox)

Nova conversa mockada, diálogo turno a turno mostrando o fluxo completo: cliente pede reunião →
agente pergunta dia/período → agente "consulta" disponibilidade (mensagem simulando a consulta) →
cliente escolhe horário → agente confirma e informa qual calendário foi usado. Ao final, existe uma
`Reuniao` correspondente em `mocks/reunioes.ts` com `criadaPor: "agente_ia"` e `canal` mapeado do
provedor da conta usada (`google`→`gmail`, `microsoft`→`outlook`, `calendly`→`calendly` — reaproveita
`ReuniaoCanal` existente, sem precisar renomear valores já usados em `mocks/reunioes.ts` e testes).

## Store / mocks
- `mocks/contas-agenda.ts` (novo): seed de `ContaAgendaConectada[]` — pelo menos 2 contas
  (ex.: Google + Calendly) já conectadas, pra demo mostrar o estado "funcionando".
- `store.ts`: `contasAgenda: ContaAgendaConectada[]` + actions `conectarContaAgenda` (cria/atualiza,
  mesmo padrão de mascaramento de `atualizarCredenciaisMeta`) e `desconectarContaAgenda` (remove ou
  marca inativa — decisão de implementação: **remove da lista**, mais simples e mais claro na UI).
- `agendarReuniao` (já existe) ganha o campo `criadaPor` no input — sem quebrar chamadores atuais
  (campo opcional).

## Futuro (fora desta rodada, registrado)
OAuth real por provedor, refresh token real, chamada real às 3 APIs, reversão/cancelamento de
reunião marcada por engano pelo agente, notificação ao humano responsável logo após a criação (ver
ADR-0007, seção de risco).
