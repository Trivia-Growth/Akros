---
name: adr-0008-sessao-token-memoria-refresh-cookie
description: Access token vive só em memória e o refresh token em cookie HttpOnly first-party servido por proxy no próprio domínio; dados seguem indo direto ao PostgREST.
alwaysApply: false
---

# ADR-0008 — Sessão: access token em memória, refresh token em cookie HttpOnly

**Status:** Aceito
**Data:** 2026-08-28
**Decisores:** Lucas Azevedo (Akros/Trívia Studio)
**Relacionados:** `seguranca/baseline-minimo.md` (§2 Autenticação & Sessão), ADR-0009, épico E12

## Contexto

O `seguranca/baseline-minimo.md` exige, textualmente: *"Tokens JWT armazenados em **HttpOnly
cookies** (não localStorage)"*. O `supabase-js`, na configuração padrão, persiste a sessão inteira
— access token **e** refresh token — em `localStorage`, legível por qualquer script que rode na
página. A regra escrita e a biblioteca escolhida se contradizem, e essa contradição precisa ser
resolvida antes da primeira linha de autenticação, porque ela define a forma de toda a borda.

O dado protegido é PII de processo de imigração: número de passaporte, data de nascimento,
endereço, estado civil, dependentes. O refresh token do Supabase é longevo e rotacionável pelo
portador — quem o rouba mantém acesso à conta indefinidamente, mesmo depois de o usuário fechar o
browser. É a diferença entre uma sessão comprometida e uma conta comprometida.

Restrições que pesaram na escolha:

- **Custo.** SPA estática em Netlify + Supabase. Não há orçamento nem apetite para um servidor
  permanente ou para transformar toda leitura em invocação de função.
- **Administração.** Time pequeno. Cada runtime a mais é superfície de operação, deploy e debug.
- **Segurança.** Requisito declarado como "extrema" — o critério de desempate.

## Decisão

**Três regras.**

1. **O access token nunca é persistido.** Vive em variável de módulo (memória do JS), com TTL do
   JWT reduzido para **15 minutos** na configuração do projeto Supabase. Fechou a aba, acabou.
2. **O refresh token nunca chega ao JavaScript.** Vive em cookie `HttpOnly; Secure;
   SameSite=Strict; Path=/`, gravado e lido exclusivamente por Edge Function.
3. **Dado continua indo direto ao PostgREST.** Só a sessão passa por função. O isolamento de linha
   é responsabilidade da RLS (ADR-0009 e épico E13), não de um proxy.

### Mecânica

O `supabase-js` é criado com a persistência desligada e o token injetado de fora:

```ts
createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  accessToken: async () => tokenEmMemoria,   // callback, não storage
});
```

Três Edge Functions compõem a borda de sessão — e só elas tocam o refresh token:

| Função           | Faz                                                                                   |
|------------------|---------------------------------------------------------------------------------------|
| `sessao-login`   | `signInWithPassword` no servidor. Devolve **só** o access token no corpo; grava o refresh em `Set-Cookie` HttpOnly. |
| `sessao-refresh` | Lê o cookie, rotaciona a sessão, regrava o cookie, devolve um access token novo.       |
| `sessao-logout`  | Revoga a sessão no Supabase e expira o cookie (`Max-Age=0`).                           |

O front chama `sessao-refresh` no boot (rehidrata a sessão após F5) e ao receber `401`.

### O cookie precisa ser first-party — daí o proxy

Um cookie `SameSite=Strict` em `<ref>.supabase.co` **não é enviado** a partir de `akros.com.br`:
são sites diferentes. Sem resolver isso, a decisão inteira não funciona.

A solução é um rewrite de proxy no Netlify, mantendo o browser sempre na origem da aplicação:

```toml
[[redirects]]
  from   = "/api/sessao/*"
  to     = "https://<ref>.supabase.co/functions/v1/sessao-:splat"
  status = 200
```

O browser só conversa com `akros.com.br`. O cookie é first-party, `SameSite=Strict` funciona, e
não há CORS no caminho de sessão. **Só as três rotas de sessão** passam pelo proxy — nunca dado.

### CSRF

O endpoint de refresh é autenticado por cookie, então precisa de defesa própria: `SameSite=Strict`
(barra a origem cruzada), exigência de um header customizado que formulário cross-site não
consegue definir, e conferência do `Origin` contra a allowlist já implementada em
`_shared/cors.ts`. As três juntas, não uma só.

## Alternativas consideradas

| Alternativa | Prós | Contras | Por que (não) escolhida |
|---|---|---|---|
| **A — Memória + cookie HttpOnly (escolhida)** | Roubo de refresh token por XSS deixa de existir; sessão não sobrevive ao fechamento da aba; custo praticamente zero; um runtime só | Três funções e um rewrite a manter; helpers `supabase.auth` do client não são mais usados direto | Único caminho que atende o baseline sem transformar leitura em invocação |
| **B — Padrão do `supabase-js` (localStorage)** | Custo zero, zero administração, caminho batido | Um XSS = conta comprometida de forma persistente, não sessão | Rejeitada: contradiz o baseline e o dado é PII de imigração |
| **C — `@supabase/ssr` com storage em cookie** | Menos código próprio | Os cookies são gravados por JS, logo **não** são HttpOnly — legíveis por XSS igual ao localStorage | Rejeitada: parece resolver e não resolve |
| **D — BFF completo, todo dado via função** | Token nunca no browser em nenhuma forma | Toda query vira invocação (custo por leitura); reimplementa PostgREST; duplica a autorização que a RLS já faz | Rejeitada por custo e administração, sem ganho real sobre A |

## Consequências

**Positivas**
- XSS não consegue exfiltrar credencial persistente. O pior caso vira uso do access token
  enquanto a página está aberta, com teto de 15 minutos, sem acesso posterior.
- Fechar a aba encerra a sessão de fato — comportamento desejável para o painel admin, que abre
  processo de cliente.
- Custo: cerca de três invocações por hora de usuário ativo. Ordem de grandeza de milhares por
  mês, dentro da faixa gratuita.
- Um runtime só (Supabase Edge Functions). O Netlify entra apenas com uma linha de rewrite.
- O caminho de leitura de dados não muda: continua direto ao PostgREST, com a RLS decidindo.

**Negativas / trade-offs aceitos**
- **XSS com a página aberta continua podendo agir em nome do usuário.** Isso é irredutível em SPA
  — nenhuma estratégia de armazenamento resolve. Mitigação é CSP estrita, ausência de
  `dangerouslySetInnerHTML` (hoje verdade, zero ocorrências) e o TTL curto.
- Três funções e um rewrite a manter, com teste de expiração e de rotação.
- `supabase.auth.signIn/signOut` deixam de ser chamados pelo client; o fluxo passa pelas funções.
- Realtime, se entrar, precisa receber o token renovado a cada refresh.
- TTL de 15 minutos aumenta a frequência de refresh — previsto no cálculo de custo acima.

**Fora deste ADR**
- MFA e política de senha: decisão de produto, ADR próprio se houver.
- Timeout por inatividade (o baseline sugere ~30 min): implementação de E12·2, não muda esta
  arquitetura.
