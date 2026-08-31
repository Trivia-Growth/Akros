---
name: PRODUCT
description: Por que os 4 bounded contexts restantes precisam sair do mock — E13-S09.
story: E13-S09
alwaysApply: false
---

# product.md — E13-S09 Sair do mock: jornada, documentos, pagamentos e comunicação

## Problema
Dois `P0` de `docs/SECURITY_DEBT.md` continuam abertos e são o **mesmo** problema visto de dois
ângulos:

1. **O frontend ainda não fala com o schema real.** Os 10 schemas de E13-S01..S07 têm RLS provada
   ao vivo, mas só `crm.clientes` tem adapter (E13-S08). O isolamento por `cliente_id` existe no
   banco e a aplicação não o exercita — o que significa que ele nunca é testado pelo caminho que
   o usuário usa.
2. **A store global carrega todas as personas na memória do browser.** Autenticado como um
   cliente, um `console.log(useMockDb.getState())` no DevTools mostra o dado das 5 personas. É
   inofensivo hoje porque tudo é fictício, e vira vazamento no dia em que o primeiro dado real
   entrar.

O segundo só fecha quando o primeiro fechar: enquanto a tela ler de `useMockDb`, a store precisa
estar carregada.

## Quem sente
- **Cliente da Akros** — é a pessoa cujo dado está na store. Nada de real entra na plataforma
  antes disto fechar.
- **Equipe** — hoje o admin vê 5 personas fictícias misturadas a 2 clientes reais, dependendo da
  tela. Confuso de operar e impossível de demonstrar com seriedade.

## Resultado esperado
Fora do modo demo, nenhuma tela lê de `useMockDb`. O dado que aparece é o que a RLS deixou passar,
e a store fictícia não é carregada.

## Fora de escopo
- Realtime. O padrão do E13-S08 (fetch no mount + `refetch()` manual) vale aqui — operador único,
  ADR-0009.
- Trocar `MockAnalisadorDocumento` por LLM real. É SD-04 e depende de decisão sobre PII (ADR-0005).
- Modo demo. Ele continua lendo mock, de propósito: é o que permite demonstrar sem dado real.
