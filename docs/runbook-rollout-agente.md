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

## 2. Edge Functions

```bash
for f in evolution-webhook integracoes-ia-salvar meta-whatsapp-webhook meta-instagram-webhook; do
  supabase functions deploy "$f" --project-ref mhxopadkizktsenohnbm --no-verify-jwt
done
```

Conferir `GET /functions/v1/<f>` de cada uma: 405 (webhooks e salvar) em vez de 404.
`sessao-*`, `lead-capturar` e `telemetria-erro` não mudaram.

## 3. CORS e variáveis

- `CORS_ALLOWED_ORIGINS` (secret das functions): **o comando substitui o valor inteiro**; liste todas
  as origens separadas por vírgula, p.ex.
  `supabase secrets set CORS_ALLOWED_ORIGINS="http://localhost:5173,https://imigrationakros.netlify.app,<domínio final>" --project-ref mhxopadkizktsenohnbm`.
  Só `integracoes-ia-salvar` depende disso (é chamada direto do navegador); os webhooks não usam CORS.
- Site no modo real (achado A-01): no Netlify, `VITE_DEMO_MODE=false`, `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, e novo build. Sem isso a tela de Configurações nem aparece com dados reais.

## 4. Configurar pela tela (administrador)

Admin → Configurações → "Configurar canal e agente". As chaves são digitadas só aqui.

**Evolution** — URL HTTPS, nome da instância, API key. O webhook é registrado sozinho. O número
precisa estar pareado (QR) no painel da própria Evolution.

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
