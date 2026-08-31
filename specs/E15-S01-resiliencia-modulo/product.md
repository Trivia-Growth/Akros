---
name: PRODUCT
description: Por que a resiliência por módulo existe e para quem — E15-S01.
story: E15-S01
alwaysApply: false
---

# product.md — E15-S01 Resiliência de módulo

## Problema
Hoje as três frentes da plataforma — site institucional, portal do cliente e painel admin —
compartilham um único bundle JavaScript e a mesma árvore React sem nenhuma barreira de erro. Uma
exceção durante o render de qualquer tela sobe até a raiz e o React desmonta a aplicação inteira:
tela branca, em todas as frentes ao mesmo tempo.

Não é hipótese. Os dois últimos bugs corrigidos no projeto foram exatamente crashes de render
(seletor Zustand com `.filter()` inline estourando `useSyncExternalStore`, corrigidos em E12-S01).
Enquanto o produto roda em `localhost` para demo, isso é irritação. Com o site institucional em
produção captando lead, um crash numa tela do admin derruba o canal de captação — e, sem sink de
erro (SD-10 em `docs/SECURITY_DEBT.md`), ninguém fica sabendo.

## Quem sente
- **Visitante do site** — perde o formulário de lead por causa de um bug que não é do site.
- **Cliente no portal** — perde o acesso ao processo por causa de um bug do admin.
- **Equipe Akros** — descobre a queda pelo cliente, não pela telemetria.

## Resultado esperado
Falha de um módulo fica **contida no módulo**. A frente que não tem o bug continua funcionando, e
a tela que quebrou explica o que aconteceu e oferece uma saída, em vez de sumir.

## Fora de escopo
- Sink de erro / observabilidade — é E16 (SD-10). Aqui a fronteira é o Error Boundary; para onde
  o erro é enviado é decisão daquela story.
- Otimização de tamanho de bundle além do que o code-splitting já produz naturalmente.
- Service worker, offline, cache de aplicação.
