---
name: runbook-rollout-agente
description: Passo a passo para colocar o agente multicanal (Evolution, WhatsApp oficial, Instagram) no ar no Supabase real, com testes por canal e como voltar atrás. Todo passo altera produção.
alwaysApply: false
---

# Runbook — rollout do agente multicanal (E13-S13)

Estado de partida (2026-10-01): migrations `0001`–`0015` aplicadas; `0016` e as 4 Edge Functions do
agente **não** estão no ar; `CORS_ALLOWED_ORIGINS` só tem `http://localhost:5173`. Tudo abaixo muda
produção e exige confirmação explícita do dono antes de cada bloco. Projeto:
`mhxopadkizktsenohnbm` (sa-east-1).

Antes de começar, no branch a ser publicado: `pnpm run test:functions`, `pnpm test`,
`pnpm run lint:migrations` e o `db-tests` da CI verdes.

## 1. Migration `0016`

A `0016` foi corrigida no lugar porque nunca foi aplicada em ambiente algum. **Depois deste passo
ela é imutável**: qualquer ajuste vira `0017`.

1. Conferir que ainda não foi aplicada:
   `select version from supabase_migrations.schema_migrations where version = '0016';` → vazio.
2. Conferir o Vault real (a guarda da migration depende disto):
   `select pg_get_function_arguments('vault.create_secret'::regproc);` →
   `new_secret text, new_name text DEFAULT NULL, new_description text DEFAULT '', new_key_id uuid DEFAULT NULL`.
3. **Ensaiar antes**: rodar `BEGIN; <conteúdo da migration>; <asserções>; ROLLBACK;` no banco real. Foi o
   ensaio que achou o terceiro bug da `0016` (REVOKE em funções internas do Vault, `permission
   denied`), que nem a CI nem o Postgres local reproduzem. Resultado sem erro = aplica.
4. Aplicar o conteúdo de `supabase/migrations/0016_E13-S12_integracao_evolution_openrouter.sql`
   pelo mesmo caminho das anteriores (SQL via Management API ou `supabase db push`) e registrar a
   versão em `supabase_migrations.schema_migrations` (`version = '0016'`,
   `name = 'E13-S12_integracao_evolution_openrouter'`).
5. Conferir: tabelas `configuracoes.referencias_cofre` e `comunicacao.webhooks_canal` existem com
   RLS forçada; `select crm.normalizar_telefone('+55 (11) 98888-1001');` → `551188881001`.
6. Conferir que o Data API **não** enxerga o cofre: com a chave `anon`,
   `GET /rest/v1/referencias_cofre` com `Accept-Profile: configuracoes` → 401/403.

## 1b. Migration `0039` (E13-S15)

Servidor e matriz Evolution, estado do canal, conversa "contato não identificado", bucket privado
`comunicacao-anexos` e escopo `evolution-servidor` no Vault. Ensaiar antes (`BEGIN; …; ROLLBACK;`),
conferir `select count(*) from storage.buckets where id = 'comunicacao-anexos'` e que `anon` não lê
`configuracoes.evolution_servidor`. Reverso no cabeçalho; só antes de haver conversa real.

## 1c. Migration `0040` (E13-S15, transcrição de áudio)

Tabela `configuracoes.transcricao_audio` (uma linha, nasce vazia = transcrição desligada) e escopo
`transcricao` no Vault. **A regex de escopo do Vault é recriada**: depois de aplicar, conferir que
os escopos antigos continuam aceitos (`evolution:`, `openrouter:`, `microsoft-graph:`,
`upload-sessao:`; o teste SQL `22-transcricao-audio_test.sql` faz isso). Ensaiar antes
(`BEGIN; …; ROLLBACK;`). Reverso no cabeçalho; só reverter com a transcrição desligada.

## 1d. Migration `0041` (E13-S15, correções da revisão adversarial AV-01..AV-03)

Tira do cliente a escrita que ele não deve ter: remove as policies de UPDATE do cliente em
`crm.clientes` e `agenda.reunioes` e troca o `INSERT` em `lgpd.solicitacoes`/`lgpd.consentimentos` por
`GRANT` por coluna. Ensaiar antes (`BEGIN; …; ROLLBACK;`) e rodar o teste SQL
`supabase/tests/23-cliente-sem-escrita-operacional_test.sql` contra o banco real em transação.
Depois de aplicar: com sessão de **cliente**, `PATCH` em `crm.clientes` do próprio id responde sem
alterar nada; com sessão de **admin**, o painel de clientes e a agenda continuam editando. Reverso no
cabeçalho. O portal não escreve nessas tabelas, então não há tela a conferir além de abrir o portal.

## 2. Edge Functions

As correções da revisão adversarial mexem em `_shared/` (rate limit, leitura de corpo, pipeline do
agente), que entra no pacote de **todas** as funções. Faça o deploy de todas:

```bash
for f in $(ls supabase/functions | grep -v '^_'); do
  supabase functions deploy "$f" --project-ref mhxopadkizktsenohnbm --no-verify-jwt
done
```

Conferir `GET /functions/v1/<f>` de cada uma: 405 (webhooks e salvar) em vez de 404.

**Origem do rate limit (AV-04) — conferir ANTES de confiar nos tetos.** O limite deixou de usar o 1º
elemento de `x-forwarded-for` (forjável). Faça um pedido de teste por caminho (direto em
`/functions/v1/sessao-login` e pelo Netlify em `/api/sessao/login`), cada um com `X-Forwarded-For`
forjado diferente, e confira em `seguranca.rate_limit` que o balde **não** muda com o valor forjado e
que os dois caminhos não caem todos num balde só. Se caírem, ajuste os secrets das funções:
`RATE_LIMIT_PROXIES_CONFIAVEIS` (quantos proxies anexam o IP; padrão 1) ou `RATE_LIMIT_IP_HEADER`
(cabeçalho que a plataforma sobrescreve, p.ex. `cf-connecting-ip`). Detalhe em `docs/SECURITY_DEBT.md`.

## 3. CORS e variáveis

- `CORS_ALLOWED_ORIGINS` (secret das functions): **o comando substitui o valor inteiro**; liste todas
  as origens separadas por vírgula, p.ex.
  `supabase secrets set CORS_ALLOWED_ORIGINS="http://localhost:5173,https://imigrationakros.netlify.app,<domínio final>" --project-ref mhxopadkizktsenohnbm`.
  Só `integracoes-ia-salvar` depende disso (é chamada direto do navegador); os webhooks não usam CORS.
- Site no modo real (achado A-01): no Netlify, `VITE_DEMO_MODE=false`, `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, e novo build. Sem isso a tela de Configurações nem aparece com dados reais.

## 3b. Antes de conectar canal: Playground (E13-S14)

1. Configurações → "Configurar agente e canal", **sem** marcar "Conectar um canal agora": chave
   OpenRouter, modelo, orientação e tom. Salvar.
2. Comunicação → aba Agente IA → Playground. Teste as sugestões e o seu próprio vocabulário de
   cliente. Mensagens com "advogado", "pagamento", "boleto", "contrato", "senha", "humano" vão direto
   para o encaminhamento (a IA nem é chamada).
3. O agente só conhece o texto de **Orientação e tom** (até 16 mil caracteres) e a conversa. O que ele
   errar por falta de informação (preços, prazos, serviços, tom, o que prometer ou não), coloque na
   orientação e teste de novo. Base de conhecimento ainda não é consultada.
4. Só depois conecte o canal (seção 4) e ligue o agente.

## 4. Configurar pela tela (administrador)

Admin → Configurações → "Configurar canal e agente". As chaves são digitadas só aqui.

**Evolution (E13-S15, ADR-0021)** — fluxo próprio em Configurações → "Canal WhatsApp · Evolution"; a
instância é criada e pareada **pelo Akros**, sem painel da Evolution:

1. **Servidor:** URL HTTPS pública + chave de administração do servidor. Versão fora da matriz fica
   "incompatível": rode o smoke (`quickstart` da spec 006) e use **Registrar versão provada**.
2. **Número:** "Adicionar número" (nome + número com DDI/DDD).
3. **Criar instância e instalar webhook:** o Akros só avança depois de **reler** o webhook na Evolution.
4. **Aceite do risco de banimento → QR Code →** escanear com o número do canal. Número diferente do
   cadastrado não conecta.
5. **Mensagem de teste** (para um número seu, diferente do canal) → **Ativar canal** → vincular o
   agente. O agente continua nascendo desligado.

**Transcrição de áudio (E13-S15, ADR-0022)** — Configurações → "Transcrição de áudio". Nasce
**desligada** e **não** muda nada até ser ligada. Antes de ligar, o escritório confere o contrato de
dados do provedor (o áudio do cliente sai do Akros). Passos: provedor (Groq recomendado) + modelo +
idioma + chave + aceite → **Testar chave e modelo** (nenhum áudio enviado) → **Ligar**. O teste não
prova a transcrição: **envie um áudio de voz do WhatsApp** de um número cadastrado e confira o texto
em Comunicação (`quickstart` passo 3b). Teto de 120 transcrições/hora. Para voltar atrás: **Desligar**
(áudio volta a ser guardado + encaminhamento).

Se a conexão travar: **reinicie o servidor Evolution** (sair da sessão e escanear de novo pode parar o
recebimento em versões afetadas; a tela não oferece isso). Trocar o **endereço** do servidor reinicia
todos os canais; trocar só a chave, não.

**WhatsApp oficial** — no painel do app na Meta: *Phone number ID*, *WhatsApp Business Account ID*,
token permanente de usuário do sistema e *App Secret*; invente (ou gere) o token de verificação.
Salve na tela; a tela mostra o endereço de callback. Na Meta → WhatsApp → Configuração → Webhook:
cole o endereço e o token de verificação, confirme (a Meta chama o GET) e assine o campo `messages`.

**Instagram** — *Instagram business account ID*, Page Access Token (a conta precisa estar ligada a
uma Página) e *App Secret*. Mesmo procedimento do webhook, produto Instagram, campo `messages`.

O agente nasce **desligado**. Ligue só depois dos testes abaixo.

## 5. Teste ponta a ponta, por canal

Para cada canal, com o agente ligado e uma conta de teste:

| # | Ação | Esperado |
|---|---|---|
| 1 | Enviar "Oi, quero saber sobre o EB-2 NIW" | Resposta do agente em até 30 s; conversa aparece em Comunicação com o canal certo |
| 2 | Enviar "quero falar com um advogado" | Mensagem de encaminhamento, sem custo de IA |
| 3 | Reentregar o mesmo evento (Evolution: reenvio manual; Meta: botão de teste do painel) | Nenhuma segunda resposta |
| 4 | Enviar de um número cadastrado em Clientes | Conversa vinculada ao cliente; evento na timeline dele |
| 5 | Chamar o webhook sem assinatura/token (`curl -X POST`) | 401, nada gravado |
| 6 | Desligar o agente e enviar mensagem | Mensagem registrada, sem resposta |

Registrar o resultado no `docs/STATE.md`.

## 6. Voltar atrás

- **Parar o agente sem desfazer nada:** desmarcar "Ativar agente" e/ou "Canal conectado" na tela.
- **Tirar um canal do ar:** `supabase functions delete <função>`; a conta fica sem webhook.
- **Reverter a migration:** só enquanto não houver conversa real. Rollback no cabeçalho da `0016`;
  depois de haver dado, criar `0017` em vez de desfazer.
- **Chave vazada:** trocar a chave no provedor e salvar de novo na tela (o Vault atualiza o mesmo item).
