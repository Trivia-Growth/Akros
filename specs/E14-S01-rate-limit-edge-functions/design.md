---
name: DESIGN
description: Onde o contador vive, como a chave é formada e por que fail-closed — E14-S01.
story: E14-S01
alwaysApply: false
---

# design.md — E14-S01 Rate limiting nas Edge Functions

**Tier:** arquitetural. Escolhe onde vive estado compartilhado entre invocações de function — uma
fronteira nova que toda função futura vai herdar.

## O problema real: Edge Function não tem memória

Cada invocação pode cair num isolate diferente. Contador em variável de módulo conta **por
isolate**, o que na prática não conta nada. O estado precisa ser externo e atômico.

## Alternativas

| Onde | Prós | Contras | Veredito |
|---|---|---|---|
| **Postgres (escolhida)** | Já existe, é transacional, `UPSERT` resolve a corrida num round-trip, e a retenção cabe num `DELETE` agendado | Uma escrita por requisição protegida | Escolhida — na escala atual (2 usuários seed) o custo é irrelevante, e não acrescenta infraestrutura para manter |
| Upstash / Redis externo | Feito para isto, latência baixa | Fornecedor novo, credencial nova, ponto de falha novo — e SD-05 já registra que não há cofre de credenciais | Reavaliar quando o volume justificar |
| Deno KV | Sem infra extra | Não é garantido no runtime de Edge Function do Supabase | Descartada por incerteza de plataforma |
| Contador em memória do isolate | Trivial | **Não funciona** — conta por isolate | Descartada |

## Schema

Tabela `seguranca.rate_limit` com `(chave, janela_inicio)` como chave primária e `contador`.
`seguranca` é schema novo: não é dado de negócio e não deve conviver com `crm`/`jornada`.

RLS FORCE como toda tabela (gate de `lint-migrations`). Nenhum papel de aplicação tem policy —
só `service_role` acessa, e mesmo ele passa por `GRANT` explícito. Cliente e admin **não** leem
esta tabela: saber quantas tentativas restam é informação para quem ataca.

## A chave, e por que ela é hasheada

`hash(ip + ":" + rota)`. O IP vem de `x-forwarded-for` — atrás do proxy do Netlify e do Supabase,
`req.conn.remoteAddr` é o proxy, não o cliente.

**IP é dado pessoal sob a LGPD.** Guardar IP em claro numa tabela cria obrigação de retenção e
export que a tabela não deveria carregar. Por isso a chave é `sha256(ip + segredo + rota)`: serve
para contar, não serve para identificar. O segredo vem do Vault (mesma trilha de SD-05).

Retenção: linha com janela vencida é lixo. `DELETE` de janelas antigas junto do `UPSERT` —
sem cron novo para manter.

## Fail-closed, e onde isso dói

`seguranca/os-grade.md` pede `fail-closed` no caminho sensível. Consequência que precisa ser dita:
**se o banco cair, ninguém consegue fazer login.** É a troca consciente — a alternativa é que uma
falha de banco vire janela aberta para força bruta.

`telemetria-erro` é a exceção deliberada: ela é anônima, não dá acesso a nada, e recusar um
relatório de erro por indisponibilidade do limitador só apagaria telemetria justamente quando algo
já está quebrado. Lá o comportamento é `fail-open` com log — e essa exceção está escrita aqui para
não parecer descuido.

## Tetos iniciais

| Função | Janela | Teto | Por quê |
|---|---|---|---|
| `sessao-login` | 15 min | 10 por IP | Força bruta é o alvo. 10 cobre erro humano com folga. |
| `sessao-refresh` | 1 min | 30 por IP | Renovação legítima é rara; 30 é folga larga. |
| `sessao-logout` | 1 min | 30 por IP | Mesma faixa; sem motivo para ser mais frouxo. |
| `telemetria-erro` | 1 min | 60 por IP | Um crash em loop gera rajada legítima. Acima disso é ruído ou abuso. |

Números são ponto de partida, não verdade — o AC-5 exige que a contagem seja observável
justamente para poder ajustá-los com dado real.
