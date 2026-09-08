---
name: DESIGN
description: Desenho de Vault, Edge Functions e pipeline Evolution/OpenRouter — E13-S12.
story: E13-S12
tier: arquitetural
integracoes: [evolution, openrouter]
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

## Modo degradado

- **Evolution fora do ar (webhook não recebe ou `/message/sendText` falha):** `evolution-webhook`
  já persistiu a mensagem recebida antes de chamar qualquer serviço externo — nada se perde. Se o
  envio da resposta falhar, a função **não reenvia** (evita duplicar mensagem no WhatsApp do
  cliente quando a falha é só na confirmação); a falha é log estruturado sem segredo, não some
  silenciosa.
- **OpenRouter fora do ar / erro / timeout:** mesma regra de fail-closed do restante da sessão —
  sem resposta do modelo, a função não envia nada ao cliente em nome do agente; erro vai para log,
  não para o WhatsApp do cliente como se fosse resposta do agente.
- **Sem chave/agente inativo (não é "fora do ar", é config ausente):** entrada é registrada como
  ignorada, sem tentativa de chamada externa — ver decisão acima.
