---
name: DOMAIN
description: Modelo seguro de credenciais, webhook e resposta IA — E13-S12.
story: E13-S12
tier: arquitetural
alwaysApply: false
---

# domain.md — E13-S12

## Linguagem

- **Conta de canal:** instância Evolution ligada a um número/identificador público.
- **Agente:** regra de atendimento ligada a uma ou mais contas de canal.
- **Referência de cofre:** escopo sem segredo e UUID de item no Vault; não contém chave.
- **Recebimento:** id único recebido de Evolution. É a unidade de deduplicação.
- **Handoff:** resposta padronizada que transfere conversa para equipe humana.

## Invariantes

- API key, token de webhook e resposta do Vault nunca entram em JSON público, log ou resposta HTTP.
- Só `service_role` invoca RPC que lê/escreve Vault; usuário autenticado não recebe `EXECUTE`.
- Uma combinação conta Evolution + `origem_id` produz no máximo uma tentativa de resposta.
- Conta ou agente inativo jamais envia mensagem externa.
- Conteúdo do WhatsApp é dado não confiável, sempre papel `user` no LLM.
