---
name: adr-0012-cofre-vault-webhook-capability
description: Credenciais BYOK ficam no Supabase Vault e webhook Evolution autentica por capability token de cabeçalho por conta.
alwaysApply: false
---

# ADR-0012 — Vault para BYOK; capability token no header Evolution

**Status:** Aceito
**Data:** 2026-09-05
**Decisores:** Lucas Azevedo (Akros), Codex
**Relacionados:** ADR-0008, ADR-0009, specs/E13-S12-integracao-evolution-openrouter/

## Contexto

Administradores precisam cadastrar API keys Evolution/OpenRouter no produto. Guardar no browser,
em JSONB ou exigir cadastro manual no painel Supabase quebra a experiência e cria superfície de
vazamento. Evolution também chama endpoint público sem JWT Supabase, portanto precisa de
autenticação independente por conta.

## Decisão

- A UI envia key somente por HTTPS para Edge Function autenticada como admin e protegida por CSRF.
- Edge Function lê/escreve Supabase Vault somente por RPC `SECURITY DEFINER` exclusiva de
  `service_role`; tabela normal guarda apenas UUID de referência/escopo, nunca segredo.
- Cada conta Evolution ganha capability token aleatório de 256 bits, guardado no Vault e enviado
  pela Evolution no header `x-akros-webhook`. URL contém apenas UUID público da conta.
- Agente inicia inativo; conta ou agente inativo não emite mensagem externa.
- Recibo único `(conta_canal_id, origem_id)` vem antes de OpenRouter/Evolution. Falha externa fica
  rastreável e não é repetida automaticamente, priorizando ausência de duplicata no WhatsApp.

## Alternativas consideradas

| Alternativa | Prós | Contras | Por que (não) escolhida |
|---|---|---|---|
| **Vault + header capability (escolhida)** | Cifra autenticada gerida pelo projeto; não pede segredo operacional manual; token não vaza na URL | Depende do Vault provisionado pelo Supabase; retry requer operação humana | Menor privilégio e fluxo viável pela UI |
| Chave em JSONB/tabela comum | Implementação curta | Backup/API/auditoria podem expor segredo | Rejeitada: viola AC de não expor chave |
| Chave de cifra em variável da Edge Function | Separaria banco/chave | Exige usuário/devops configurar e rotacionar segredo adicional | Rejeitada: volta a pedir painel Supabase |
| Token na query string | Compatível com webhook simples | Logs, proxy e histórico podem registrar token | Rejeitada: header customizado é suportado pela Evolution |

## Consequências

**Positivas:**

- Pessoa administradora configura tudo no produto; chave nunca é relida pelo frontend.
- Webhook é verificável em tempo constante e isolado por conta.
- Mesmo retry do provedor não dispara duas respostas/duas cobranças de LLM.

**Negativas / trade-offs aceitos:**

- Projeto Supabase precisa disponibilizar Vault; migration falha fechada se extensão não existir.
- Resposta enviada com sucesso seguida de erro local não é reenviada automaticamente; inbox exibe
  recibo pendente/falha para intervenção humana.
- Agente não processa mídia, pagamento, caso jurídico ou agendamento nesta primeira versão.
