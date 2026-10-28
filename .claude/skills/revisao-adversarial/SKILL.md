---
name: revisao-adversarial
description: Use antes de dar PASS numa feature para tentar QUEBRAR cada AC em vez de confirmá-lo — borda, erro parcial, concorrência, buraco na spec e abuso (inclusive gate que passa sem verificar nada). Agentes: @qa + @security. Acione com /revisao-adversarial.
---

# Skill: Revisão adversarial (tentar quebrar, não confirmar)

Gate verde prova que **o caminho feliz funciona** — não que a feature está correta. Esta skill é a
passada oposta: você assume que a entrega **está quebrada** e tenta provar. **Donos:** `@qa` +
`@security`.

**Postura.** Não releia a `spec.md` procurando o que foi cumprido. Leia procurando o que ela
**não diz** e o que ninguém testou. Achado sem reprodução é opinião; opinião não entra no
relatório.

## Como rodar
1. Liste os `AC` da `spec.md` da feature.
2. Para cada `AC`, passe pelas **5 frentes** abaixo e escreva as tentativas que fez — inclusive as
   que não quebraram nada (elas são a prova de que a frente foi coberta).
3. Todo achado reproduzido vira **teste que falha** antes de virar correção (regra de saída).
4. Emita o veredito.

---

## Frente 1 — Borda e entrada inválida
Pergunte do dado, não do formulário. O formulário valida; a função por trás dele recebe o que
vier.

- Vazio, zero, negativo, um a mais que o limite, um a menos que o mínimo.
- String onde se espera número; `null` onde se espera objeto; array vazio onde se espera lista.
- Texto com emoji, acento, aspas, `<script>`, 10 mil caracteres, quebra de linha.
- Data no passado, data no futuro, fuso diferente, horário de verão.
- Dinheiro: centavo fracionado, moeda diferente, valor que estoura o `Number`.
- **Quem chama sem passar pela UI?** Se a regra só vive no componente, a porta está aberta.

## Frente 2 — Erro parcial e falha no meio
A pergunta é sempre: **o que já mudou quando falhou?**

- Rede cai depois do primeiro `await` e antes do segundo — o estado ficou consistente?
- A operação escreve em dois lugares. O segundo falha. O primeiro é revertido ou vira órfão?
- Terceiro (Supabase, Google, Meta, OpenRouter) responde 500, 429, ou timeout — o usuário vê o
  quê? E se responder 200 com corpo vazio ou com campo faltando?
- O usuário aperta o botão duas vezes. Fecha a aba no meio. Dá F5 durante a operação.
- Token expira exatamente entre a checagem e o uso.

## Frente 3 — Concorrência e ordem de eventos
- Dois usuários editam o mesmo registro ao mesmo tempo — quem ganha, e alguém é avisado?
- O admin libera a fase enquanto o cliente envia o documento daquela fase.
- Evento chega fora de ordem (webhook duplicado, retry do provedor, mensagem repetida).
- Um `useEffect` dispara duas vezes; um seletor devolve referência nova a cada render.
  *(Classe já vista neste repo: seletor Zustand com `.filter()` inline quebrando
  `useSyncExternalStore` — dois crashes em E12-S01.)*
- Operação idempotente? Rodar duas vezes produz o mesmo estado ou duplica?

## Frente 4 — Buraco na spec
O alvo aqui não é o código: é o **silêncio da spec**. Procure o que alguém teve que decidir
sozinho porque o AC não decidiu.

- Que caso o AC não menciona e vai acontecer mesmo assim? (registro sem dono, lista vazia,
  usuário que existe mas não tem permissão)
- Duas partes da spec se contradizem?
- O código faz algo que a spec não pede — está em "Fora de escopo"?
- Existe `SPEC_DEVIATION` no código sem par em `tasks.md`, ou vice-versa?
- Decisão difícil de reverter tomada sem ADR? Se sim, **pare** e escale (`ANTI-PADROES.md`).

## Frente 5 — Abuso, privilégio e gate falso
- **Autorização:** troque o `id` na URL para o de outro cliente. Chame a rota do admin com sessão
  de cliente. Chame a Edge Function direto, sem passar pelo front.
- **Segredo:** algum token, chave ou `service_role` chega ao browser? Aparece em log, em mensagem
  de erro, ou na resposta HTTP?
- **Custo:** o que impede alguém de chamar mil vezes? (rate limit, quota de LLM, upload gigante)
- **Gate que passa sem verificar nada** — a classe de bug que a auditoria de 2026-08-30 achou
  **duas vezes**, e a que mais assusta porque produz confiança falsa:
  - O gate roda sobre uma lista vazia? Rode com `--verbose` ou imprima o que ele avaliou. Se o
    número de itens for zero, é **FAIL**, não sucesso.
  - **Quebre o alvo de propósito** e confirme que o gate fica vermelho. Gate que nunca foi visto
    falhando não é gate.
  - O gate tem um `skip` condicional (binário ausente, Docker ausente, variável não definida)?
    Então ele é best-effort — trate como se não existisse.
  - O teste faz assert de alguma coisa, ou só renderiza e não estoura?
  - Existe teste do próprio gate em `scripts/*.test.mjs`? Se não, ele é uma promessa.

---

## Regra de saída
**Todo achado reproduzido vira teste que falha ANTES de virar correção.** Sem o teste vermelho,
não há prova de que a correção corrigiu — e o bug volta na próxima refatoração.

## Veredito
- **PASS** — as 5 frentes foram percorridas por AC e nenhum achado foi reproduzido. Liste o que
  você tentou; "não achei nada" sem tentativas listadas não é PASS.
- **CONCERNS** — achado que não quebra o AC mas expõe risco (registre em `docs/SECURITY_DEBT.md`
  se for segurança, ou vira story própria).
- **FAIL** — algum achado reproduzido. Vira teste, volta ao `@dev`, não segue para PR.

> Alimenta `/validar` (passo 7) e `/revisar-pr`. Só `@devops` faz merge/push.
