---
name: adr-0022-transcricao-de-audio
description: Transcrição de áudio recebido por canal (WhatsApp) — provedor, credencial, o que sai do Akros, comportamento na falha e o que ainda precisa de prova real.
alwaysApply: false
---

# ADR-0022 — Transcrição de áudio: o áudio vira texto, nunca vira palpite

**Status:** Aceito (ligado só depois de homologar com áudio real)
**Data:** 2026-10-28
**Decisores:** Lucas Azevedo
**Relacionados:** ADR-0021 (Evolution confiável), ADR-0012 (Vault), ADR-0017 (agente multicanal),
`specs/006-evolution-confiavel/` (US9); referência (somente leitura): repositório Atendimento
`docs/adr/0035-integracao-transcricao-de-audio.md` e `supabase/functions/transcrever-audio/`.

## Contexto

No WhatsApp brasileiro o áudio é, para muitos clientes, a forma principal de contato. Depois da
ADR-0021 o áudio é guardado e a equipe o ouve, mas o agente fica mudo: responde só com o
encaminhamento. O TriviAtende resolveu com uma função `transcrever-audio` (OpenAI, OpenRouter ou
Groq). **Essa transcrição nunca foi testada ponta a ponta** (informação do dono, 2026-10-28), então
o contrato de cada provedor foi conferido na documentação oficial em vez de copiado.

Achados da conferência (2026-10-28):

- **Groq** — `POST https://api.groq.com/openai/v1/audio/transcriptions`, multipart, modelos
  `whisper-large-v3-turbo` e `whisper-large-v3`, formatos incluem `ogg`, 25 MB no plano gratuito.
  A página não cita Opus nem política de retenção de dados.
- **OpenRouter** — `POST https://openrouter.ai/api/v1/audio/transcriptions`, aceita multipart
  compatível com a OpenAI (campo `prompt` é ignorado) e JSON com `input_audio`; a política de dados
  (`provider.zdr`) **só existe no corpo JSON**, não no multipart; 25 MB; formatos variam por provedor
  de infraestrutura.
- **OpenAI** — `whisper-1` está marcado como **descontinuado (desligamento em 2027-02-26)**; o
  modelo recomendado (`gpt-transcribe`) muda o parâmetro de idioma e o formato de resposta, e a
  página não lista `ogg`. Contrato não provado.

## Decisão

1. **Provedores aceitos: Groq (padrão) e OpenRouter.** OpenAI fica fora até o contrato do modelo novo
   ser provado. Os endereços são **constantes no código** (nada digitado pelo admin vira URL: sem
   SSRF). O modelo é escolhido numa lista curta; o servidor confere, na lista do próprio provedor, se
   ele existe para a chave.
2. **Uma configuração por instalação** (single-tenant, ADR-0009), não por agente nem por canal:
   transcrever é infraestrutura. Tabela `configuracoes.transcricao_audio` (uma linha) com provedor,
   modelo, idioma (automático por padrão: cliente pode falar PT ou EN), indício de 4 caracteres, aceite
   e prova. **A chave fica no Vault** (`transcricao:<id>`), write-only na tela.
3. **Ligar exige duas provas, no banco e na função:** (a) o admin **aceita** que o áudio dos
   clientes sai do Akros para aquele provedor (o aceite vale para UM provedor; trocar de provedor pede
   outro); (b) **chave e modelo verificados** (`GET` autenticado na lista de modelos, sem gastar
   transcrição). Trocar provedor, modelo ou chave derruba as duas. Chave ou modelo recusados de forma
   definitiva desligam a transcrição; queda passageira do provedor não. O teste não prova a
   transcrição em si: **só um áudio real prova** — é etapa da homologação.
4. **Áudio → texto no webhook, antes de registrar.** O áudio é baixado e guardado como qualquer anexo
   (ADR-0021). Com a transcrição ligada, o texto falado vira o texto da mensagem e o agente atende
   como atenderia um texto (inclusive o encaminhamento por pedido de humano). **Qualquer falha** —
   provedor fora, chave recusada, áudio sem fala, teto de gasto, configuração ilegível — registra o
   **motivo** (código, nunca texto do provedor) e cai no caminho do anexo comum: o áudio original
   continua guardado e o cliente recebe o encaminhamento à equipe. Nunca texto inventado, nunca
   mensagem descartada.
5. **Teto de gasto:** 120 transcrições por hora (`TETOS["transcricao-audio"]`, fail-closed). Estourar
   não perde a mensagem. A mesma regra vale para remetente não identificado: o texto serve à equipe, e
   o teto limita o abuso.
6. **Mostrado como transcrição:** a tela de Comunicação mostra o texto com o aviso "transcrição
   automática — pode conter erros"; falha mostra "transcrição indisponível · motivo".

## O que sai do Akros (LGPD)

O **áudio bruto** do cliente (voz, nome, endereço, qualquer conteúdo falado) é enviado ao provedor a
cada transcrição. Base: execução do atendimento que o próprio cliente iniciou. O Akros guarda o áudio e
o texto na conversa; **a retenção do lado do provedor não é controlada por nós** — as páginas
consultadas não declaram política de retenção. Por isso o aceite é explícito e por provedor, a
transcrição nasce **desligada**, e o contrato de dados do provedor escolhido deve ser conferido pelo
escritório **antes** de ligar. O Akros não enviará `provider.zdr` (só existe no corpo JSON); se o
escritório exigir retenção zero, a mudança é enviar JSON com `provider.zdr: true` no OpenRouter (nova
story, nova prova).

## Alternativas consideradas

| Alternativa | Por que (não) escolhida |
|---|---|
| Portar o `transcrever-audio` do TriviAtende como está | rejeitada: nunca provado; roteamento e política de dados (`zdr`) declarados mas não enviados no multipart |
| Reusar a chave OpenRouter do agente | rejeitada: transcrever vale sem agente e para a equipe; misturaria custo e isolamento |
| OpenAI `whisper-1` | rejeitada: descontinuado em 2027-02-26 |
| OpenAI `gpt-transcribe` | adiada: parâmetro e resposta diferentes, `ogg` não listado; provar antes |
| Transcrever por agente/canal | rejeitada: infraestrutura de instalação (como no TriviAtende) |
| Fila assíncrona | adiada para E13-S16 (saída durável): hoje o webhook já é síncrono |
| Sem transcrição (só encaminhar) | é o comportamento com a transcrição desligada |

## Consequências

- (+) O agente entende o áudio e a equipe lê sem ouvir; o original sempre fica guardado.
- (+) Falha do provedor nunca derruba o webhook nem perde a mensagem.
- (−) **Síncrono no webhook:** a transcrição soma até 20 s ao tempo do webhook (mais a resposta do
  agente). Se a Evolution estourar o tempo e reentregar, o áudio pode ser transcrito duas vezes antes
  de o recibo existir (gasto duplicado, nunca mensagem duplicada). Fila e retry: E13-S16.
- (−) Whisper pode alucinar em áudio com ruído ou silêncio; o aviso "pode conter erros" e o áudio
  original à mão são a mitigação. Áudio sem fala reconhecida cai no encaminhamento.
- (−) Dependência de terceiro para uma função de atendimento; desligar a configuração volta ao
  encaminhamento.
- **Ainda sem prova real:** (1) voz de WhatsApp (Opus em Ogg) aceita pelo provedor escolhido; (2) o
  tempo real de ponta a ponta com a Evolution do Akros. Ambos são itens da homologação
  (`quickstart.md`, passo 5).
