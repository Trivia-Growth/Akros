---
name: DESIGN
description: Contratos de porta, entidades de domínio e fluxo de DI da camada mock.
story: E00-S04
---

# DESIGN — Camada de mock + DI (E00-S04)

Tier arquitetural (ADR-0002/0003). Define as fronteiras que todas as features vão consumir.

## Fluxo

```
UI (hook useX) → use case (application) → Porta (interface) → MockXRepository → useMockDb (Zustand)
                                                              └─(futuro) SupabaseXRepository → Supabase
```

## Entidades de domínio (base do futuro schema)

Definir em `features/<ctx>/domain/`. Campos mínimos (expandir conforme features):

- **Lead** { id, nome, email, telefone, origem, tipoVistoInteresse, estagio, criadoEm, notas[] }
- **Cliente** { id, nome, email, telefone, tipoVisto, jornadaId, caseManager, criadoEm, dados360 }
- **Jornada** { id, clienteId, faseAtual, fases: Fase[] }
- **Fase** { id, ordem (0=Introdução..5), titulo, status: bloqueada|liberada|em_andamento|concluida, etapas: Etapa[] }
- **Etapa** { id, titulo, descricao, status: pendente|concluida, prazoMedio?, docsRequeridos?[] }
- **Documento** { id, clienteId, faseId?, nome, tipo, status: pendente|enviado|em_analise|aprovado|ajustes, url(mock), enviadoEm }
- **SolicitacaoAssinatura** { id, documentoId, status: aguardando|assinado, assinadoEm? }
- **Pagamento** { id, clienteId, descricao, valor, moeda, status: pendente|pago|atrasado, vencimento, tipo: entrada|taxa_federal|parcela }
- **Reuniao** { id, clienteId, titulo, inicio, fim, canal: calendly|gmail|outlook, status, transcricaoId? }
- **Transcricao** { id, reuniaoId, texto, resumo, criadoEm } (fonte: Fireflies)
- **Conversa** { id, clienteId, canal: whatsapp_oficial|evolution, mensagens: Mensagem[] }
- **Mensagem** { id, autor: cliente|agente_ia|humano, texto, enviadoEm, lida }
- **Proposta** { id, leadOuClienteId, escopo, valor, status: rascunho|enviada|aceita|recusada, criadoEm }

## Contratos de porta (assinaturas)

```ts
interface LeadRepository {
  listar(): Promise<Lead[]>;
  obter(id: string): Promise<Lead | null>;
  criar(input: NovoLead): Promise<Lead>;         // usado pelo form da homepage
  moverEstagio(id: string, estagio: EstagioLead): Promise<void>; // kanban
  atualizar(id: string, patch: Partial<Lead>): Promise<void>;
}
interface JornadaRepository {
  obterPorCliente(clienteId: string): Promise<Jornada>;
  liberarFase(clienteId: string, faseId: string): Promise<void>;   // gate do admin
  concluirEtapa(clienteId: string, etapaId: string): Promise<void>;
}
// ... análogo para Cliente, Documento, Pagamento, Agenda, Conversa, Proposta, Transcricao
```

Regra do gate (unlock sequencial): `liberarFase` muda a fase alvo de `bloqueada`→`liberada`. A UI do
portal só permite agir em fases `liberada|em_andamento`. Fase N+1 permanece `bloqueada` até o admin liberar.

## DI container (`app/di.ts`)

```ts
// Nesta fase, sempre mock. Trocar aqui no futuro (uma linha por porta).
export const container = {
  leads: new MockLeadRepository(mockDb),
  jornada: new MockJornadaRepository(mockDb),
  // ...
};
```

Hooks de acesso (`useLeads`, `useJornada`, …) chamam use cases que recebem `container.X`.
**Proibido** a UI instanciar Mock* diretamente.

## Store (`useMockDb`, Zustand)
- Semeado por `seed()` a partir de `src/mocks/*`.
- Ações mutáveis correspondentes aos métodos de escrita das portas.
- `resetarDemo()` re-executa `seed()`. Cenários (E05-S02) chamam seeds alternativos.

## Consequências
- Boilerplate de portas agora; ganho: migração Supabase sem tocar UI e domínio testável.
