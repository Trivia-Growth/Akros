---
name: DESIGN
description: Ordem por dependência de ID e perímetro de telas para saída do mock — E13-S11.
story: E13-S11
alwaysApply: false
---

# design.md — E13-S11 Ondas de saída do mock

## Regra de entrega

Cada fatia é `adapter + hook + todas as telas consumidoras + teste` no mesmo commit. `di.ts` só muda
depois que nenhuma tela daquela fatia lê `useMockDb`; trocar adapter antes produz escrita real e
leitura mock, estado dividido já observado em `crm.leads`.

## Ondas

```
1. Folhas: programas, configuracoes.*, agenda.transcricoes
2. Ancoradas em UUID: jornada.*, documentos.*, pagamentos.*, agenda.reunioes,
   comunicacao.*, crm.propostas
3. Transversais: AdminDashboard, AdminAgenda, Operacao, Cliente360, proposta/documento
4. Corte: lazy load demo-only, remover personas/mock store/mapa, E2E de isolamento
```

`configuracoes.*` pode começar vazia: UI apresenta estado vazio e onboarding administrativo cria dado
real; nunca replica IDs string ou segredos dos mocks. A tabela de propostas usa `lead_id XOR
cliente_id`, portanto telas que a leem entram somente após ambas origens terem UUID real no fluxo.
`ProgramasPage` expõe duplicação, mas E13-S04 concedeu somente `SELECT, UPDATE`: `0015` adiciona
somente `INSERT` admin para manter essa mutação sem abrir catálogo a cliente.

## Inventário remoto de 05/09

Há linhas em `crm.clientes` (2), `jornada.*` (2/2/2), documentos (2), pagamentos (2), reuniões (2),
programas (1), conversas (1) e eventos (2). Não há dados operacionais em proposta, equipe, contas,
transcrição ou solicitações de assinatura; a única integração é registro técnico E13-S10
soft-deletado. Isso proíbe validar UI real desses conjuntos com dado mock e exige estado vazio/teste
de adapter até cadastro real autorizado.

## Limites

- Porta continua no domínio; hook não importa infrastructure.
- JSONB é mapeado/validado no adapter, sem casts soltos na tela.
- Sem novos seeds de produção. Testes usam banco/local ou registros técnicos removidos/soft-deletados.
- Política de acesso vem da migration existente; lacuna de RLS vira nova story, não fallback mock.
