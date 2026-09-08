---
name: TASKS
description: Decomposição por onda para E13-S11.
story: E13-S11
alwaysApply: false
---

# tasks.md — E13-S11 Ondas de saída do mock

## Task 1 — Contrato e inventário (AC-1 a AC-6)

Fixar ondas, telas completas, dados remotos disponíveis e fronteira sem seed fictício nestes quatro
artefatos.

**Gate:** `pnpm run audit:esteira` e `pnpm run eval:spec` verdes.

## Task 2 — Onda folha (AC-1, AC-5)

Implementar portas/adapters/hooks/telas de programas, configurações e transcrições. `0015` libera
INSERT de programa só para admin, pois duplicação é mutação existente. Cada tela sem linha real
apresenta vazio; `di.ts` troca somente ao fim da própria fatia.

**Gate:** teste SQL RLS de programa, testes de adapter e render vazio/real; Playwright admin fora
do demo.

**Andamento 05/09 — Programas concluído:** `SupabaseProgramaRepository` mapeia JSONB e normaliza a
linha legada já presente no remoto sem fazer seed/escrita; `ProgramasPage` e sua métrica de casos
usam portas reais. `0015` prova INSERT apenas para admin; o browser autenticado abriu
`/admin/programas` com `VITE_DEMO_MODE=false`. Configurações e transcrições seguem nesta task.
O `AdminLayout` ainda consome notificações mock e só será cortado na Task 5, após as ondas que lhe
fornecem fontes reais.

**Andamento 05/09 — Configurações concluído em leitura:** `ConfiguracoesRealPage` lê as quatro
coleções de `configuracoes` por adapter/hook e prova no browser os quatro estados vazios reais.
OAuth e credenciais ficam explicitamente indisponíveis até cofre de segredos; a tela não aceita,
transmite ou persiste segredo no browser. Transcrições foram entregues com reuniões UUID na Task 3,
para não cruzar identificadores mock e reais.

## Task 3 — Onda ancorada (AC-2, AC-5)

Migrar jornada, documentos, pagamentos, reuniões, comunicação e propostas por UUID, incluindo todas
as mutações que cada tela expõe.

**Gate:** testes de portas, navegação cliente/admin real e releitura após mutação autorizada.

**Andamento 05/09 — Agenda e transcrições concluídas em leitura:** `SupabaseAgendaConsulta` lê
`agenda.reunioes` e `agenda.transcricoes`; no portal não recebe ID do claim legado, pois RLS resolve
o cliente por `auth.uid()` e devolve o UUID de `crm.clientes`. Portal e `/admin/agenda` renderizam
somente dados reais, validados por adapter test e Playwright fora do demo. Criação de reunião segue
indisponível: não existe endpoint seguro de provedor e o navegador não faz INSERT direto.

**Andamento 05/09 — Jornada concluída em leitura:** `SupabaseJornadaConsulta` recompõe o agregado
normalizado `jornadas`/`fases`/`etapas` por UUID retornado pelo RLS; `/portal/jornada` não importa
`di.ts` nem envia o ID legado da sessão. A tela não expõe envio ou atualização de status: a policy
histórica de UPDATE não impõe as transições de negócio e precisa ser trocada por RPC/Edge Function
antes de habilitar mutação. Adapter test e Playwright cliente fora do demo passaram.

**Andamento 05/09 — Documentos e Pagamentos concluídos em leitura:**
`SupabaseDocumentosConsulta` lê documentos, assinaturas e JSONB defensivamente;
`SupabasePagamentosConsulta` normaliza `numeric` e instruções de recebimento. As duas telas do
portal dependem só de RLS e UUID real. Upload, assinatura, comprovante e conciliação não aparecem
fora do demo até Storage/RPC/Edge Function seguros aplicarem validação, transição e auditoria.
Adapter tests e Playwright cliente passaram junto de Agenda e Jornada.

**Andamento 05/09 — Comunicação do portal concluída em leitura:**
`SupabaseComunicacaoConsulta` lê `comunicacao.eventos` por RLS, preserva UUID e valida `anexos`
JSONB. `/portal/mensagens` não importa `di.ts`, nem recebe o `clienteId` legado; WhatsApp/e-mail
ficam fora do histórico do chat, como no contrato original. Envio fica bloqueado: `eventos` só
tem SELECT para usuário autenticado e a futura escrita precisa de Edge Function que aplique canal,
auditoria e autorização. Adapter, build e smoke serial fora do demo passaram.

**Andamento 05/09 — Propostas admin concluídas em leitura:**
`SupabasePropostasConsulta` traz propostas não removidas, leads e clientes pelos UUIDs remotos,
normalizando `numeric` e `itens_escopo` JSONB. Lista e documento em `/admin/propostas` não
importam `di.ts` nem o store mock. Inserir, enviar e alterar status foram removidos fora do demo:
o GRANT/RLS de UPDATE não valida máquina de estados, destinatário ou entrega; exigem RPC/Edge
Function antes de voltar à interface. Adapter, build e smoke admin serial passaram.

**Andamento 05/09 — Comunicação admin concluída em leitura:**
`SupabaseComunicacaoAdminConsulta` lê conversas, threads de e-mail, timeline vinculada a cliente,
resumo de agentes e fontes de conhecimento, com JSONB de mensagem validado antes de renderizar.
`/admin/comunicacao` troca toda interface mock por abas reais sem ações de escrita. Responder,
enviar mídia, transcrever e alterar agentes permanecem indisponíveis até canais/Storage e Edge
Functions aplicarem autorização e auditoria. Configuração do Playwright passou a `workers: 1`:
`fullyParallel: false` não serializava arquivos e logout de uma persona revogava sessão de outra.

**Andamento 05/09 — Fila de revisão concluída em leitura:**
`SupabaseDocumentosAdminConsulta` lê documentos e resolve nomes de clientes pelas fontes reais;
`/admin/documentos` só mostra itens em análise. Aprovar, pedir ajuste ou baixar arquivo seguem
bloqueados até RPC/Storage com autorização e auditoria.

**Andamento 05/09 — Dashboard admin concluído em leitura:**
`SupabaseDashboardAdminConsulta` consulta CRM, jornada, pagamentos, agenda, documentos e timeline
em paralelo. Funil, saúde, fases e pendências são agregados a partir das linhas reais; receita fica
separada por moeda, sem somar BRL e USD. A rota raiz `/admin` não importa store mock fora do demo.
O bootstrap de sessão também espera antes de habilitar login, evitando corrida entre refresh inicial
e rotação do refresh token; adapter, build e Playwright serial 10/10 passaram.

## Task 4 — Telas transversais (AC-3)

Trocar cada leitor remanescente de dashboard, agenda administrativa, operação, Cliente 360 e
proposta/documento só depois das fontes da onda 2.

**Gate:** busca estática sem `useMockDb` nessas telas; smoke test fora do demo.

**Andamento 05/09 — Operação concluída em leitura:**
`SupabaseOperacaoAdminConsulta` agrega clientes, jornadas, fases, etapas e eventos de entrada por
UUID retornado pelo RLS. Gargalos agrupam título/responsável — nunca UUID de fixture — e alertas
mantêm o vínculo do caso real. `/admin/operacao` não importa store mock; adapter, build e smoke
admin serial passaram.

**Andamento 05/09 — Cliente 360 concluído em leitura:**
`SupabaseCliente360AdminConsulta` consulta em paralelo clientes, jornadas/fases/etapas, documentos,
pagamentos, reuniões, conversas, e-mails e timeline. A composição preserva o UUID de
`crm.clientes` e refaz cada jornada só com suas fases/etapas; `/admin/clientes` não carrega
`Cliente360` mock, ações de escrita nem mapa temporário. Adapter, build e Playwright serial 10/10
passaram.

## Task 5 — Corte demo (AC-4 a AC-6)

Carregar mocks apenas por import dinâmico do modo demo, remover mapa/`SPEC_DEVIATION` e ampliar E2E
de isolamento de cliente.

**Gate:** teste prova store ausente fora do demo; Playwright real cobre A/B; `pnpm test`, build e
`arch:check` verdes.

**Andamento 05/09 — Corte parcial validado:** `MAPA_ID_REAL_PARA_MOCK` foi removido. Dashboard e
Perfil do portal ganham dados pela linha que RLS autoriza para `auth.uid()`, sem depender do
`cliente_id` legado da sessão. Layouts carregam `DemoBar`, identidade e notificações mock apenas
por `lazy import` no modo demo; E2E serial 10/10 prova que sessão real não baixa `mocks/store`.
`StrictMode` agora compartilha um único refresh por bootstrap, mantendo o lote abaixo do teto de
30 refreshes/minuto. AC-4 ainda não fecha: `/admin/leads`, `/admin/aprovacoes`,
`/admin/pagamentos` e `/admin/reativacao` continuam rotas mock até migração ou ocultação fora do
demo.

**Fechamento 05/09 — ocultação (decisão do usuário):** as quatro rotas passam a existir só no
modo demo; fora dele redirecionam para `/admin` (`Navigate` no router, sem carregar o chunk mock)
e os itens somem do menu do `AdminLayout` (`demoOnly`). Decisão consciente: ocultar fecha o P0 do
SECURITY_DEBT agora; migrar kanban/aprovações/conciliação/reativação exige mutações que seguem
bloqueadas (sem RPC/Edge Function de transição/auditoria) e vira story própria. AC-7 novo na
`auth-matrix.spec.ts` prova pelo caminho do usuário: admin real navega para as quatro rotas,
cai no dashboard e não vê os itens no menu.
