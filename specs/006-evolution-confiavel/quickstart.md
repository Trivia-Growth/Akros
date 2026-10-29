# Quickstart: validar a E13-S15

Pré-requisitos: servidor Evolution com HTTPS público e a chave global; número de teste (chip
separado); `CORS_ALLOWED_ORIGINS` com o domínio do site; migration `0039` aplicada; função
`canal-evolution` publicada.

## 1. Gates locais (sem servidor)

```bash
pnpm run test:functions
pnpm run lint:migrations
pnpm run check:edge-functions
pnpm run arch:check
pnpm --filter @akros/web test
pnpm --filter @akros/web typecheck
```

Banco: Postgres 17 limpo + `supabase/tests/00-shim-supabase.sql`, migrations em ordem e
`supabase/tests/*_test.sql` com `ON_ERROR_STOP=1` (ver `docs/runbook-rollout-agente.md`).

## 2. Smoke de contrato contra o servidor real (FR-024, SC-007)

```bash
EVOLUTION_URL=https://SEU-SERVIDOR EVOLUTION_APIKEY=SUA-CHAVE \
  deno run --allow-net --allow-env scripts/evolution-contract-smoke.ts
```

Cria uma instância `smoke-…`, prova as cinco capacidades obrigatórias e **apaga** a instância. Saída:
JSON com versão, capacidade → provada e `compativel`. Sem chave, QR ou payload. Nada é alterado no
Akros. Se a apagada falhar, o JSON diz o nome para limpar à mão. O **envio** não se prova aqui (exige
número pareado): é provado pela mensagem de teste do passo 3 (ou rodando o smoke de novo com
`EVOLUTION_INSTANCIA_PAREADA=<nome> EVOLUTION_NUMERO_TESTE=<seu número>`).
Depois do smoke: Configurações → Canais → Evolution → **Registrar versão provada** com a evidência.

## 3. Fluxo pela tela (admin)

1. Configurações → Canais → Evolution → informar URL e chave → **compatível** (se a versão não estiver
   na matriz: registrar após o smoke).
2. Criar canal (nome + número) → **Criar instância e instalar webhook** → “aguardando pareamento”.
3. Aceitar o risco → **Gerar QR** → escanear com o número de teste → “conectado e verificado”.
   Escanear outro número → “número diferente”, não conecta.
   Enviar a **mensagem de teste** a um número seu (diferente do canal) → só então **Ativar canal** libera.
   Vincular o agente que atende o número.
4. Ligar o agente (Configurações → agente) e enviar do celular de teste:
   - texto → resposta do agente; mesmo texto reenviado → sem resposta repetida (SC-003);
   - “quero falar com um advogado” → encaminhamento;
   - imagem, PDF, áudio → aparecem em Comunicação com o anexo; cliente recebe o encaminhamento;
   - remetente sem telefone → “Contato não identificado”, sem resposta.
5. Derrubar a sessão no celular → estado “desconectado” em até 1 evento/abrir a tela.

## 3b. Transcrição de áudio (ADR-0022) — só depois do passo 3 funcionar

Antes: o escritório confere o contrato de dados do provedor (o áudio do cliente sai do Akros).

1. Configurações → **Transcrição de áudio** → Configurar: provedor (Groq recomendado), modelo, idioma,
   chave de API, aceite do envio de dados → **Salvar** → **Testar chave e modelo** (nenhum áudio é
   enviado) → **Ligar transcrição**.
2. Do celular de teste (número cadastrado), gravar **um áudio de voz do WhatsApp** (Opus em Ogg) com
   uma frase simples, p.ex. "oi, quero saber sobre o visto EB-2". **Isto prova o que o teste não
   prova:** o provedor aceita voz de WhatsApp.
3. Conferir em Comunicação: a mensagem traz o texto falado com "transcrição automática — pode conter
   erros"; o áudio original abre; o agente responde ao conteúdo. Anotar o tempo até a resposta
   (esperado: poucos segundos; se passar de ~20 s, a Evolution pode reentregar — ver ADR-0022).
4. Áudio dizendo "quero falar com um advogado" → encaminhamento, sem IA.
5. Falha induzida: desligar a rede do provedor (ou usar chave errada ao **Alterar**) e mandar outro
   áudio → áudio guardado, "transcrição indisponível · motivo", cliente recebe o encaminhamento.
6. Se der certo, registrar o resultado (provedor, modelo, formato) em `docs/STATE.md`.

## 4. Segurança (manual rápido)

```bash
curl -i -X POST "$URL_WEBHOOK" -d '{}'                 # 401, nada gravado
curl -i -X POST "$URL_WEBHOOK" -H 'x-akros-webhook: errado' -d '{}'   # 401
```

Conferir que respostas, logs da função e banco não contêm chave (do servidor **nem do provedor de
transcrição**), token, segredo, QR nem corpo.
