---
name: PRODUCT
description: Integração operacional de agentes WhatsApp via Evolution e OpenRouter — E13-S12.
story: E13-S12
tier: arquitetural
alwaysApply: false
---

# product.md — E13-S12 Agentes WhatsApp reais

## Problema

A operação precisa configurar Evolution e OpenRouter no painel, sem guardar chave no browser ou
pedir que alguém cadastre segredo manualmente no Supabase. Após ativação explícita, mensagens de
texto recebidas no WhatsApp devem receber resposta do agente configurado.

## Resultado

- Administrador cola chaves apenas na Central de configurações.
- Segredos entram por HTTPS numa Edge Function, ficam cifrados no Supabase Vault e nunca voltam à UI.
- A própria função registra webhook da instância Evolution.
- Agente começa desligado. Somente checkbox explícito permite resposta externa.
- Conversa e evento entram no histórico; duplicata de webhook não responde duas vezes.

## Fora de escopo

- Mídia, áudio, agendamento, campanhas e envio manual pelo inbox.
- Decisão jurídica, consulta de caso, pagamento ou automação sem revisão humana.
- Retry automático de envio externo: falha fica rastreável para tratamento humano, evitando duplicata.
