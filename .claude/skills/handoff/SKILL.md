---
name: handoff
description: Use ao pausar ou retomar trabalho para manter continuidade entre sessões — reescreve o topo curto de docs/STATE.md (data, story ativa, próximo passo, bloqueios) e arquiva o resto em docs/state-historico/AAAA-MM.md. Acione com /handoff.
---

# Skill: Handoff (continuidade entre sessões)

Mantém a continuidade via `docs/STATE.md`. Use ao **pausar** e ao **retomar**.

`docs/STATE.md` é leitura obrigatória de início de sessão — **toda** sessão paga o custo dele em
contexto. Por isso ele tem **duas partes com regras diferentes**, e a skill existe para que a
segunda nunca coma a primeira. (Ele chegou a 26,7 kB com o cabeçalho carimbando uma data 11 dias
mais velha que a última entrada — auditoria de 2026-08-30.)

## A forma obrigatória do arquivo

```markdown
---
name: STATE
description: ...
alwaysApply: false
---

# STATE.md — Estado de Trabalho Akros

## Agora            ← REESCRITO por inteiro a cada handoff. Alvo: cabe em uma tela.
- **Data:** <AAAA-MM-DD>          ← a data de HOJE, não a da sessão anterior
- **Story ativa:** <ID + link para specs/…/spec.md>, ou "nenhuma"
- **Próximo passo:** <uma ação concreta, executável por quem chegar sem contexto>
- **Bloqueios:** <o que trava e quem/como destrava — ou "nenhum">
- **Decisões desta sessão:** <1 linha cada; se difícil de reverter, virou ADR e é linkado>

## Histórico
Sessões anteriores em `docs/state-historico/` — ver `docs/state-historico/INDEX.md`.
```

**Nada além disso vive no `STATE.md`.** Narrativa da sessão, detalhe técnico e armadilha
descoberta vão para o arquivo do mês. Não são menos importantes — são apenas leitura sob demanda.

## Ao pausar
1. **Arquive antes de escrever.** Mova o conteúdo de "Agora" da sessão anterior para
   `docs/state-historico/AAAA-MM.md` (mês da sessão que está saindo), como uma seção
   `## AAAA-MM-DD — <resumo de uma linha>`. Se o arquivo do mês não existe, crie com frontmatter
   `alwaysApply: false` — arquivo histórico **nunca** entra no carregamento automático.
2. **Adicione a linha no índice.** `docs/state-historico/INDEX.md` ganha uma linha: período,
   arquivo, resumo de uma frase.
3. **Reescreva "Agora" do zero.** Não edite por cima nem acrescente: reescreva. É por acréscimo
   que um arquivo de retomada vira diário.
4. **Confira a data.** Cabeçalho com data velha é pior que sem data — quem lê acredita nela.

## Ao retomar
Leia `## Agora` e a `spec.md` da story ativa. Continue do "Próximo passo". Não re-derive o que já
está registrado. Precisa de contexto mais antigo? `docs/state-historico/INDEX.md` primeiro,
`grep -rn "termo" docs/state-historico/` depois — nunca leia o histórico inteiro.

## Duas regras que não se dobram
- **Detalhe técnico não é cortado por brevidade** — ele é *movido* para o arquivo do mês.
  Encurtar a entrada de hoje perde informação; arquivar não perde nada (confirmado com Lucas,
  2026-07-13, e continua valendo).
- **STATE é volátil.** Decisão durável vai para ADR (`docs/adr/`), não para o STATE. Se você está
  escrevendo algo no STATE que vai importar daqui a três meses, está escrevendo no lugar errado.
