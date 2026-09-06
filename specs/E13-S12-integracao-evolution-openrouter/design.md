---
name: DESIGN
description: Desenho de Vault, Edge Functions e pipeline Evolution/OpenRouter — E13-S12.
story: E13-S12
tier: arquitetural
alwaysApply: false
---

# design.md — E13-S12

## Fluxo

```text
UI admin -- HTTPS/JWT/CSRF --> integracoes-ia-salvar
                                  |-- Vault (RPC service_role)
                                  |-- Evolution /webhook/set/{instance}
                                  '-- regras + conta pública

Evolution -- header secreto --> evolution-webhook
                                 |-- dedup persistente
                                 |-- OpenRouter Chat Completions
                                 '-- Evolution /message/sendText/{instance}
```

`x-akros-webhook` é um capability token aleatório de 256 bits, mantido apenas no Vault e na
configuração privada da instância Evolution. URL contém somente UUID público da conta; não há
segredo em query string.

## Segurança

- Vault usa cifra autenticada gerenciada pelo projeto Supabase; migration apenas cria referências
  e RPCs `SECURITY DEFINER` com `auth.role() = service_role`.
- Função administrativa valida usuário via `auth.getUser`, claim `app_metadata.role=admin`, CSRF,
  tamanho, schema estrito e rate limit fail-closed.
- Webhook público exige token em header, comparação em tempo constante, body limitado e rate limit.
- Prompt fixa limites, separa conteúdo não confiável e não dá tools ao modelo.
- Falha externa não expõe resposta de Evolution/OpenRouter nem segredo em log.

## Decisões

- Webhook recebe somente `MESSAGES_UPSERT`, sem eventos de saída; impede loop do próprio agente.
- Recebimento primeiro persiste. Repetição retorna 200 sem nova chamada LLM/envio.
- Sem chave/configuração/agente ativo, entrada é registrada como ignorada; não há saída.
