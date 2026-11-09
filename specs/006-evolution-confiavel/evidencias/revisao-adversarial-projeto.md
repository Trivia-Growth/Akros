# Revisão adversarial do projeto — 2026-10-28 (correções em 2026-10-29)

> Postura: assumir que está quebrado e tentar provar. Escopo: projeto inteiro (banco, Edge Functions,
> webhooks de canal, sessão, gates), com a E13-S15 como ponto de partida. Base: commit `4fcc33c`,
> Postgres 17 limpo com as 40 migrations, Deno e vitest locais. **Nada foi testado contra produção,
> Supabase real, Netlify real, Evolution real ou provedor de transcrição real.**

## Veredito

- **Projeto: FAIL.** Três achados de banco e um de custo foram reproduzidos; viram teste vermelho antes
  de qualquer correção. Os scripts de reprodução foram removidos depois das correções: cada um virou o
  teste permanente indicado na tabela "Estado das correções".
- **E13-S15 isolada: CONCERNS.** Nenhum achado nasceu no código novo da story; AV-05 e AV-07 vivem no
  pipeline compartilhado que ela herda, e a story não os piora.

## Estado das correções (2026-10-29)

Cada correção nasceu de teste vermelho (visto falhar contra o código antigo) e ficou verde. **Isto não
é PASS:** a re-verificação independente (`/revisao-adversarial` por outro revisor) continua pendente, e
AV-04 só fecha com confirmação na plataforma.

| ID | Correção | Prova permanente | Falta |
|---|---|---|---|
| AV-01 | migration `0041`: remove `cliente_atualiza_a_propria_linha` (o portal só lê `crm.clientes`) | `supabase/tests/23-cliente-sem-escrita-operacional_test.sql` (cliente: 0 linhas e coluna intacta; admin ainda atualiza) | deploy da `0041` |
| AV-02 | `0041`: remove `cliente_atualiza_a_propria_reuniao` | idem (reunião intacta; admin ainda atualiza) | deploy; se o produto quiser cancelar/reagendar pelo cliente, vira RPC com regra própria |
| AV-03 | `0041`: `GRANT INSERT` por coluna em `lgpd.solicitacoes` e `lgpd.consentimentos` | idem (`42501` ao informar `status`, `concluido_em`, `motivo_negacao`, `aceito_em`, `revogado_em`; pedido legítimo nasce `pendente`) | deploy |
| AV-04 | `origemDoPedido`: N-ésimo `x-forwarded-for` a partir da direita (`RATE_LIMIT_PROXIES_CONFIAVEIS`, padrão 1) ou cabeçalho da plataforma (`RATE_LIMIT_IP_HEADER`); sem prova ⇒ balde `desconhecido` | `supabase/functions/_shared/rate-limit.test.ts` | **confirmar na plataforma e ajustar os secrets** — `docs/SECURITY_DEBT.md` (P1) |
| AV-05 | `cotaContato` no pipeline: 30 respostas de IA/h por (conta, contato) antes da chamada paga; esgotou ⇒ encaminhamento sem repetir | `agente.test.ts` (AV-05, 5 testes) e `rate-limit.test.ts` (chave por identidade) | ajustar o teto com o log `cota de IA do contato esgotada` |
| AV-06 | gate exige a CHAMADA `checarLimite(` fora de comentário e um teste de 429 para todo handler compartilhado que consulta o limitador; testes de 429 que faltavam (`envio-comandos`, `arquivo-baixar`, `arquivo-processar`) | `scripts/check-edge-functions.test.mjs` (3 casos novos) e os 3 testes de handler; mutações vistas vermelhas | — |
| AV-07 | `_shared/corpo.ts`: leitura em stream com corte no teto, usada nos webhooks, `lead-capturar`, `telemetria-erro`, `sessao-login` (4 KiB) e nos handlers autenticados | `supabase/functions/_shared/corpo.test.ts` (mutação vista vermelha: 5 falhas) | limite de corpo da plataforma segue não verificado |
| AV-08 | `vite build` falha se `VITE_SUPABASE_URL` existe com demo ligado (padrão aberto mantido: decisão AJUSTES A-01) | `apps/web/vite.guardas.test.ts`; build visto falhar/passar nos 3 ambientes | A-01 (modo real no Netlify) |
| AV-09 | registrado como P2 em `docs/SECURITY_DEBT.md` (URL só do admin) | — | fixar o IP resolvido na conexão |

## Achados originais

## Achados reproduzidos (como estavam antes das correções)

| ID | Gravidade | Onde | Resumo |
|---|---|---|---|
| AV-01 | Alta | `crm.clientes` | O cliente reescreve a própria linha inteira pelo PostgREST |
| AV-02 | Média | `agenda.reunioes` | O cliente muda horário, status e título da própria reunião |
| AV-03 | Média | `lgpd.*` | O cliente cria pedido LGPD já "concluído" e consentimento retroativo |
| AV-04 | Alta (a confirmar na plataforma) | `_shared/rate-limit.ts` | Chave do limite usa o 1º item de `x-forwarded-for`, que o cliente forja |
| AV-05 | Média | pipeline do agente | Nada limita as respostas de IA que UM contato dispara |
| AV-06 | Média | `check-edge-functions` | Gate de rate limit fica verde sem a chamada existir |
| AV-07 | Baixa/Média | `lerCorpoLimitado`, `lead-capturar` | Limite de corpo só vale com `content-length`; em chunked lê tudo antes |

### AV-01 — cliente escreve em `crm.clientes` sem restrição de coluna

Reprodução original (hoje coberta por `supabase/tests/23-cliente-sem-escrita-operacional_test.sql`), com JWT de cliente:

```
UPDATE crm.clientes SET case_manager='Hacker', tipo_visto='eb1a', programa_id='outro',
  programa_versao='999', deleted_at=now() WHERE auth_user_id = <o próprio>
-> UPDATE 1   (case_manager=Hacker, tipo_visto=eb1a, programa_versao=999, apagado=t)
```

Causa: a policy `cliente_atualiza_a_propria_linha` (0001) só confere a posse, e `authenticated` tem
`UPDATE` na tabela inteira. A A-02 (0018) fechou documentos, pagamentos e jornada, mas não esta tabela.
O portal não precisa dessa escrita: o único `.update` sobre `clientes` na web é do repositório do admin.

Impacto: o cliente troca o responsável do caso, o tipo de visto e o programa/versão (a regra "congela
programa em uso" da E03-S07 protege o programa, não a linha do cliente), esconde-se das listas do admin
com `deleted_at`, e troca `telefone`/`email`. Telefone igual ao de outro cliente torna o vínculo
por telefone ambíguo e desliga as conversas daquele outro.

Correção sugerida: gatilho `BEFORE UPDATE` que recusa mudança de coluna operacional quando
`NOT crm.e_admin()` (admin e cliente usam o mesmo role, então `REVOKE` simples quebra o admin), ou
`GRANT UPDATE (colunas)` por coluna. Teste de regressão SQL antes.

### AV-02 — cliente muda a própria reunião

Reprodução R2. `UPDATE agenda.reunioes SET inicio = now() - interval '10 days', status='realizada'` com JWT
de cliente: `UPDATE 1`. A policy `cliente_atualiza_a_propria_reuniao` (0006) não tem `WITH CHECK` nem
restrição de coluna. Nenhuma tela do portal escreve aqui. Se o cliente deve cancelar ou reagendar, isso
é regra de produto e precisa de RPC; se não deve, basta revogar.

### AV-03 — evidência LGPD forjável pelo titular

Reproduções R3 e R4. O cliente insere `lgpd.solicitacoes` com `status='concluida'` e `concluido_em` preenchido
(fura o prazo e a trilha de atendimento), e `lgpd.consentimentos` com `aceito_em='2020-01-01'`.
Correção: `status`, `concluido_em`, `motivo_negacao`, `aceito_em`, `revogado_em` definidos pelo servidor
(`DEFAULT` + `GRANT INSERT (colunas)` só do que o titular informa).

### AV-04 — rate limit forjável (`x-forwarded-for`)

Reprodução original (hoje `rate-limit.test.ts`) — 3 pedidos do mesmo atacante com o 1º item forjado
diferente geram 3 chaves de balde diferentes. `origem()` usa o primeiro item de `x-forwarded-for`.
A discussão pública do Supabase relata que o cliente consegue sobrescrever esse cabeçalho
(<https://github.com/orgs/supabase/discussions/34647>).

**Não sei** como o gateway do Supabase e o rewrite do Netlify tratam o cabeçalho em produção, e dois
desfechos são ruins: (a) o valor chega como o cliente mandou, e o limite vira decorativo em
`sessao-login` (10/15 min), `lead-capturar` (5/h), webhooks e playground; (b) o valor nunca chega, todos
caem no balde `desconhecido`, e 10 logins em 15 min valem para o sistema inteiro (bloqueio geral por
qualquer um). Verificação segura, a fazer por quem tem acesso: um único pedido de teste ao ambiente
com `X-Forwarded-For` forjado e ver a chave gravada em `seguranca.rate_limit`.

### AV-05 — custo de IA sem teto por contato

Reprodução original (hoje `agente.test.ts`) — 200 mensagens de um contato, 200 chamadas pagas.
O único teto é por IP de origem do webhook (120/min na Evolution, 600/min na Meta), ou seja, global:
um remetente que fala demais gasta a conta OpenRouter até esse teto e ainda consome o balde dos demais
(os legítimos recebem 429). Correção: cota por (conta, contato) no pipeline, antes de `gerarResposta`,
com fallback para o encaminhamento. Não está em `SECURITY_DEBT.md`.

### AV-06 — gate de rate limit é presença de texto

Reprodução (cópia em diretório temporário): em `lead-capturar/index.ts` troquei a chamada por
`const limite = { permitido: true }` e deixei `checarLimite` no `import`: `check-edge-functions` seguiu
com `✓ 16 função(ões) declarada(s)`. O gate testa `/\bchecarLimite\b/` no arquivo. As funções finas
(`canal-evolution`, `evolution-webhook`, `caso-comandos`) só montam `deps.limite`; nada prova que o
handler compartilhado o chama. Correção: um teste por handler que injeta `limite` negando e espera 429.

### AV-07 — limite de corpo não vale em chunked

Reprodução original (hoje `corpo.test.ts`) — corpo de 20 MiB sem `content-length` é lido inteiro
(`await req.arrayBuffer()`) antes de ser recusado, apesar do comentário "ANTES de materializar". Afeta
os webhooks da Meta (o corpo é lido antes da assinatura, por necessidade do HMAC) e `lead-capturar`
(anônima; usa `req.text()`). A Evolution autentica antes de ler. O teto de corpo da plataforma não foi
verificado. Correção: ler o stream em blocos e abortar ao passar do limite.

## Concerns sem reprodução de ponta a ponta

- **AV-08 — `isDemoMode` é fail-open.** `VITE_DEMO_MODE !== "false"` (`shared/lib/env.ts`): build sem a
  variável serve `/admin` e `/portal` sem guarda. Os dados são mock, mas é o estado atual de produção
  (A-01 em `STATE.md`) e basta esquecer a variável de novo. Sugestão: build de produção falha se
  `VITE_SUPABASE_URL` existe e o modo demo está ligado.
- **AV-09 — DNS rebinding.** `validarUrl` resolve e confere a cada chamada, mas o `fetch` do Deno
  resolve de novo; o IP não é fixado. A URL é configurada só pelo admin, então o risco é baixo (P2).
- **Pagamentos por papel.** `participante_ve_pagamentos_do_caso` e o download de versão ligada a
  pagamento valem para qualquer participante ativo, inclusive `familiar_apoio`. Pode ser decisão da
  spec 005; a spec não diz. Pergunta para o dono do produto, não achado.

## O que tentei e não quebrou

- **RLS FORCE:** nenhuma tabela dos 14 schemas de domínio sem RLS ou sem FORCE; o gate
  `lint-migrations` ficou vermelho nas duas mutações (tabela sem RLS e tabela com RLS sem FORCE).
- **Exposição:** `anon` sem privilégio em tabela de domínio, nenhum grant a `PUBLIC`, nenhuma view.
- **`SECURITY DEFINER`:** 29 funções, todas com `search_path` fixo; `EXECUTE` só para `service_role`,
  exceto quatro: `criar_cliente_a_partir_de_lead` (repete a checagem de admin dentro),
  `_minhas_participacoes_ativas` e `reserva_ativa_para_objeto` (amarradas a `auth.uid()`) e
  `audit.registrar_mudanca` (função de gatilho, não se chama direto).
- **Download de arquivo:** versão de outro caso, versão restrita a outro papel e versão de contrato
  respondem 404 (sem confirmar existência); revogado responde 403.
- **Webhook Evolution:** autentica por token em tempo constante antes de ler o corpo; reentrega
  concorrente do mesmo áudio não perde a transcrição (o arquivo repetido conta como guardado).
- **Webhook Meta:** HMAC sobre o corpo bruto antes do parse; conta inexistente 404; credencial
  incompleta 503.
- **Sessão:** refresh em cookie `HttpOnly; Secure; SameSite=Strict`, servido por proxy do Netlify
  (first-party, ADR-0008); CSRF exigido em refresh e logout; erro de login genérico.
- **Gate de migrations e SQL:** `db-tests` falha se não achar teste (lista vazia não passa).

## Não verificado

Produção (nenhuma chamada), Evolution e provedor de transcrição reais, comportamento de
`x-forwarded-for` no Supabase/Netlify, limite de corpo da plataforma, UI em navegador, e2e Playwright
(`pnpm e2e` exige ambiente autenticado), revisão manual de `caso-comandos`, `envio-comandos`,
`onedrive-oauth` e `integracoes-ia-salvar` (só inventário de autenticação e rate limit).

## Ordem sugerida

1. AV-01, AV-02, AV-03: uma migration (`0041`) com gatilho/`GRANT` por coluna e teste SQL vermelho antes.
2. AV-04: confirmar o cabeçalho na plataforma e trocar a origem (`cf-connecting-ip` ou outro valor que o
   proxy sobrescreva).
3. AV-05: cota por contato no pipeline do agente.
4. AV-06 e AV-07: teste por handler para o limite; leitura de corpo em blocos.
5. AV-08 em seguida; AV-09 vai para `SECURITY_DEBT.md` como P2.
