# Feature Specification: Compartilhamento com advogado parceiro

**Story**: E04-S17

**Feature Branch**: `feat/E04-S17-compartilhamento-advogado`

**Created**: 2026-11-06

**Status**: Draft

**Input**: "Pasta específica no OneDrive, montada por comando, só com o material do processo que
pode sair; nada financeiro e nada do 360 completo. Advogado não vira participante do caso nem
recebe login (ADR-0018). Depende de E03-S07."

Contexto: a Dra. Denise (advogada parceira) precisa receber parte do material de um caso sem
acessar o sistema Akros. A pasta operacional do caso (`arquivos.vinculos_pasta`, E03-S07) tem
TUDO — documentos, comprovantes, contrato. Esta story cria uma segunda pasta, isolada, só com o
que a equipe marcar explicitamente como compartilhável.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Equipe marca quais documentos podem saber do caso (Priority: P1)

A equipe revisa os documentos de um caso e marca, um a um, quais podem ir para a pasta do
advogado. Nenhum documento é compartilhável por padrão.

**Acceptance Scenarios**:

1. **Given** um documento do caso, **When** a equipe marca "compartilhável com advogado",
   **Then** o documento fica elegível para entrar na pasta do advogado na próxima montagem.
2. **Given** um pagamento ou dado financeiro do caso, **When** a equipe procura por uma opção de
   compartilhamento, **Then** não existe essa opção — pagamento nunca é elegível (fora de escopo
   por design, não por falta de UI).

---

### User Story 2 - Equipe monta a pasta do advogado (Priority: P1)

A equipe vincula uma pasta específica (dentro da raiz autorizada da integração Microsoft do
caso) como "pasta do advogado" — separada da pasta operacional.

**Acceptance Scenarios**:

1. **Given** uma pasta dentro da raiz autorizada, **When** a equipe vincula como pasta do
   advogado para o caso, **Then** o vínculo é registrado, nunca aceitando pasta fora da raiz
   (mesma validação de ancestralidade de `vincular_pasta`, E03-S07 ADR-0019).
2. **Given** um caso sem pasta operacional ainda vinculada, **When** a equipe tenta vincular a
   pasta do advogado, **Then** o sistema recusa — pasta do advogado pressupõe que a pasta
   operacional já existe.

---

### Edge Cases

- O que acontece se a equipe desmarcar um documento depois de já ter sido copiado para a pasta do
  advogado? Nesta entrega, a cópia já feita não é removida automaticamente (fora de escopo) — a
  próxima iteração deve tratar remoção.
- O que acontece se dois admins tentam vincular a pasta do advogado do mesmo caso ao mesmo tempo?
  Unicidade por `cliente_id` evita duplicidade (mesmo critério de `vinculo_caso_unico`).

## Requirements *(mandatory)*

- **FR-001**: Nenhum documento é compartilhável com o advogado por padrão — é ação explícita da
  equipe, por documento.
- **FR-002**: Pagamento, comprovante financeiro e dado agregado do Cliente 360 (visão completa)
  nunca são elegíveis para a pasta do advogado — só documento do processo.
- **FR-003**: A pasta do advogado é vinculada separadamente da pasta operacional do caso, dentro
  da mesma raiz autorizada pela integração Microsoft (mesma validação de ancestralidade de
  E03-S07/ADR-0019).
- **FR-004**: O advogado parceiro nunca recebe participação no caso nem login no sistema
  (ADR-0018 já estabelece isso para participantes do caso; esta story não cria exceção).
- **FR-005**: Só admin vincula a pasta do advogado e marca documentos como compartilháveis.

### Key Entities

- **Vínculo de pasta do advogado**: pasta do OneDrive, separada da operacional, por caso.
- **Documento compartilhável**: marca booleana no documento, decidida pela equipe.

## Success Criteria *(mandatory)*

- **SC-001**: É possível vincular uma pasta do advogado por caso, isolada da pasta operacional.
- **SC-002**: Nenhum dado financeiro aparece como opção de compartilhamento em nenhuma tela.

## Assumptions

- **A cópia física dos documentos marcados para a pasta do advogado (via Microsoft Graph) fica
  fora desta entrega** — implementada a estrutura (vínculo + marcação), a cópia automática entre
  pastas é tarefa seguinte, registrada em `docs/SECURITY_DEBT.md`. Hoje, depois de vincular a
  pasta, a cópia dos arquivos marcados é manual (a equipe copia pelo próprio OneDrive) até a
  automação existir.
- Geração de link de compartilhamento para o advogado (fora do sistema) também fica fora desta
  entrega — a equipe compartilha a pasta pelo painel nativo da Microsoft/OneDrive por agora.
