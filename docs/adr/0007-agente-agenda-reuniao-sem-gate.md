---
name: adr-0007-agente-agenda-reuniao-sem-gate
description: A tool de agendamento do agente de IA marca reunião direto (sem aprovação humana por reunião) — exceção escopada ao princípio de humano no loop, condicionada à ativação explícita do admin.
alwaysApply: false
---

# ADR-0007 — Agente agenda reunião direto via tool de calendário (sem gate por reunião)

**Status:** Aceito
**Data:** 2026-08-19
**Decisores:** Trívia Studio (decisão de produto tomada nesta sessão pelo operador do protótipo —
**não** confirmada com a Akros/Bruno Luz; revisitar antes de qualquer fase com dado real)
**Relacionados:** ADR-0005, ADR-0006, épico E04, épico E11 (E11-S04)

## Contexto
O protótipo já tem duas decisões de "humano no loop": ADR-0005 (IA nunca muda status de documento
sozinha) e E11-S04 (gate humano — nada vai para a agenda sem aprovação, no fluxo de qualificação de
lead do WhatsApp). A postura padrão da Akros, registrada no próprio ADR-0005, é manter validação
humana também na qualificação de lead.

Foi pedido: uma tool de calendário (Google/Microsoft/Calendly) para o agente de atendimento, que
**marca a reunião direto na conversa** — pergunta dia/período ao cliente, consulta disponibilidade,
confirma e cria o evento — sem um humano aprovar aquela reunião específica antes de ela existir.
Isso diverge do padrão acima e foi sinalizado explicitamente antes de implementar.

## Decisão

**1. É uma exceção escopada, não uma mudança de princípio geral.** O gate humano de E11-S04
continua exatamente como está para o fluxo de qualificação de lead (`Lead.gateAgendamento`,
`decidirGateAgendamento`, `/admin/aprovacoes`) — este ADR não toca nesse código nem nesse fluxo.
A tool nova é um caminho **separado**: agendamento iniciado pelo agente dentro de uma conversa do
inbox (`comunicacao`), usando contas de calendário que o admin conectou e autorizou explicitamente.

**2. A autorização humana existe — só que na configuração da capacidade, não por reunião.**
Dois atos humanos explícitos precisam acontecer antes de qualquer reunião ser criada pelo agente:
   - admin conecta credenciais reais de uma conta de calendário em `/admin/configuracoes`;
   - admin ativa a ferramenta de agendamento no agente e escolhe quais contas conectadas ele pode
     usar, em `/admin/comunicacao` → Agente IA (`RegraAtendimentoIA.ferramentaAgendamento`).
   Sem os dois, a tool não existe para o agente — não há fallback silencioso.

**3. Toda reunião criada pelo agente é rastreável.** `Reuniao.criadaPor = "agente_ia"` (vs.
`"cliente"` / `"admin"`), visível em `/admin/agenda`. Nenhuma reunião nasce sem essa origem
marcada.

**4. Mock desta fase.** Sem LLM real, sem OAuth real, sem chamada real às APIs de
Google/Microsoft/Calendly — a "consulta de disponibilidade" e a "confirmação" são simuladas em
`mocks/`, como o resto do protótipo (ADR-0002).

## Consequências

**Positivas**
- Demonstra o caso de uso mais pedido de agente de atendimento (fechar reunião sem fricção).
- A rastreabilidade (`criadaPor`) mantém auditável quem marcou o quê, mesmo sem gate por reunião.

**Negativas / risco**
- **Isto é a exceção real ao padrão "humano no loop" que o resto do protótipo defende.** Antes de
  qualquer dado real ou cliente real, a Akros precisa validar conscientemente esta decisão — ela
  não foi tomada com o cliente (ver Decisores acima). Registrar em `docs/SECURITY_DEBT.md` se
  seguir para uma fase com credenciais reais.
- Erro de agente (marcar horário errado, conta errada) agora vira reunião real sem checagem prévia.
  Mitigação futura possível: reversão fácil (cancelar/reagendar) e notificação ao humano responsável
  logo após a criação — fora de escopo desta rodada, registrado aqui para não se perder.
- Três integrações externas novas (Google Calendar, Microsoft Graph, Calendly) para manter mockadas
  coerentemente; quando qualquer uma virar real, cai a mesma preocupação de segredo/token do
  ADR-0002 e do caso Meta (E04-S06).

## Alternativas consideradas
- **Tool só sugere, gate humano aprova antes de confirmar** (mesmo padrão de E11-S04): mais seguro,
  mais alinhado à postura documentada da Akros. Foi a alternativa recomendada nesta sessão;
  descartada porque o pedido explícito foi agendamento direto sem humano no loop.
- **Reaproveitar o MCP `mcp-calendar` existente** (hoje `permissao: "leitura"`, descrição "sem
  confirmar reunião") em vez de um campo dedicado: rejeitado porque múltiplas contas por provedor e
  a seleção de quais contas usar não cabem bem no modelo genérico de `ConectorMCP`; o campo
  dedicado (`ferramentaAgendamento`) deixa a capacidade explícita e auditável na UI.
