# Specification Quality Checklist: Evolution confiável (E13-S15)

**Purpose**: Validar completude e qualidade da spec antes do planejamento
**Created**: 2026-10-27
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Sem detalhes de implementação (linguagens, frameworks, rotas). Termos de domínio (webhook, QR, cofre, LID) são o vocabulário do produto, como em `specs/003-agente-multicanal/spec.md`.
- [x] Focada em valor para o administrador e para o cliente
- [x] Escrita para quem não é técnico, com os termos técnicos mínimos
- [x] Todas as seções obrigatórias preenchidas

## Requirement Completeness

- [x] Nenhum marcador [NEEDS CLARIFICATION] restante (US5 cenário 4 resolvido em 2026-10-27: guardar como "contato não identificado", visível só à equipe; FR-025)
- [x] Requisitos testáveis e sem ambiguidade (FR-001 a FR-024)
- [x] Critérios de sucesso mensuráveis (SC-001 a SC-008)
- [x] Critérios de sucesso sem detalhe de implementação
- [x] Cenários de aceitação definidos (7 histórias)
- [x] Casos de borda identificados
- [x] Escopo delimitado (seção "Out of Scope" vinculante)
- [x] Dependências e premissas identificadas (servidor novo, versão desconhecida, E13-S16)

## Feature Readiness

- [x] Todo requisito funcional tem cenário de aceitação correspondente
- [x] Histórias cobrem os fluxos primários (servidor, instância+webhook, pareamento, recebimento) e os riscos (LID, telefone compartilhado, armadilhas)
- [x] A feature atende aos resultados mensuráveis
- [x] Sem vazamento de detalhe de implementação

## Rastreabilidade com os pontos de falha analisados

| Ponto de falha (Akros hoje) | Onde a spec trata |
|---|---|
| Webhook gravado sem prova (campo `base64`, sem releitura) | US2, FR-006, FR-007 |
| Instância criada e pareada fora do produto | US2, US3, FR-005, FR-010, FR-011 |
| Sem estado de conexão | US3, FR-008, FR-015 |
| Remetente `@lid` | US5, FR-017 |
| Telefone compartilhado vincula ao cliente errado | US6, FR-018 |
| Logout derruba o recebimento na 2.3.3 | US7, FR-019 |
| Contrato nunca provado em Evolution real | FR-003, FR-004, FR-024, SC-007 |
| Resposta perdida / sem retry / sem resposta humana / sem saúde | **E13-S16** (fora de escopo aqui) |
| Áudio e mídia | fora de escopo (story futura) |

## Notes

- Spec liberada para `/speckit-plan`. Itens FR-001 a FR-025.
- Premissa que afeta o plano: a versão do servidor Evolution do Akros é desconhecida; o smoke de contrato é o primeiro item de implementação.
