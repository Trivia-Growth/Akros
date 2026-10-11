# Cliente 360 — refinamento e sequência proposta

**Story**: E03-S07 · **Data**: 2026-10-02, revisado em 2026-10-06 · **Estado**: refinado com a
resposta do Bruno; escopo revisado e sequência abaixo.

Este documento registra descoberta e plano de entregas preliminar. `spec.md` contém o contrato
proposto. O `plan.md`, modelo de dados, contratos e tasks executáveis vêm após resolver as decisões
de escopo. Não há estimativa de esforço fechada antes de validar permissões Microsoft.

Modelo de 2026-10-02 (um processo por cliente/família, acesso só do titular) foi **revisado em
2026-10-06**: caso passa a ter participantes com papel vindo da versão do programa (ADR-0018), porque
o visto R entrou no piloto. Plano técnico em [plan.md](plan.md).

## Resposta do Bruno (2026-10-02) — o que entra, o que sai, onde conflita

Fonte: carta de Bruno Luz de 2026-10-02 sobre a `spec.md` em Draft. Leitura central dele: *"está
faltando automação no processo interno"* — a plataforma organizava o caso, mas o trabalho continuava
com a equipe, principalmente com a Natália.

**Decisões de 2026-10-06 (usuário)**

| Tema | Decisão |
|---|---|
| Visto R no piloto | Entra agora. Multi-participante e visibilidade por papel vão para o MVP (ADR-0018) |
| IA de apoio (pré-análise + rascunho) | Feature própria dependente desta (E07-S05). Esta story entrega a operação real e os ganchos |
| QuickBooks / Global Pays / lembretes / agente financeiro | Voltam ao roadmap como E10-S03 e E10-S05 |
| Dados sensíveis com IA | Mascaramento de PII na infraestrutura da Akros, provedor dedicado à análise e chave exclusiva no Vault |

**Incorporado nesta story**

- Participantes por papel do programa, visibilidade por papel e convite por participante (US6, FR-017
  a FR-020). Atende EB-2 NIW, visto R e o requisito do EB-3 de documento da empresa invisível ao empregado.
- Cadastro nascendo do contrato: programa, participantes, condições financeiras, prazos de resposta e
  prioridade contratual (FR-022, FR-023). Sem extração automática do PDF.
- Gamificação explícita: o participante só vê as tarefas da fase seguinte quando a atual conclui
  (FR-021) — regra que já estava no manual do EB-2 NIW e não estava na spec.
- Percentual de avanço e estimativa de **protocolo** pelo ritmo de entrega (US7, FR-024, FR-025),
  com a ressalva que o próprio Bruno sugeriu: nunca previsão de decisão do USCIS.
- Toda a equipe alcança o caso; responsável interno não restringe leitura (FR-026).
- Piloto com dois programas: EB-2 NIW e visto R, cerca de três casos com contrato ativo.

**Movido para stories próprias**

| Pedido do Bruno | Destino | Por quê |
|---|---|---|
| Pré-análise de documento por IA e rascunho de resposta | E07-S05 | Precisa de documento e requisito reais, que nascem aqui; traz gates de LLM (evals, prompt versionado, OWASP LLM Top 10, PII) que não devem atrasar o fluxo de arquivo e RLS |
| Resposta de gestão de ansiedade, com prioridade paga | E07-S05 | Mesmo motivo; a prioridade contratual já passa a ser registrada aqui, no contrato |
| QuickBooks, Global Pays, link recorrente, previsão de recebimento, visão financeira administrativa | E10-S03 (reaberta) | Depende de credencial e confirmação de API — pergunta aberta dele |
| Lembretes automáticos (WhatsApp + e-mail) e agente financeiro de cobrança | E10-S05 (nova) | Depende de E10-S03 e de canal de saída validado |
| Registro unificado de WhatsApp/e-mail como prova; chat no sistema com mobile | E08-S04 / E08-S05 | E08 já tem timeline e chat mockados (ADR-0006); virar real é escopo próprio |
| Compartilhamento com advogado parceiro (pasta filtrada no OneDrive) | Story própria | Terceiro contratado não é sujeito do caso; a pasta filtrada exige regra de "o que pode sair" |

**Conflitos com o que estava escrito (resolvidos)**

1. **Acesso só do titular** (decisão confirmada em 2026-10-02) × multi-participante do visto R.
   Resolvido pelo ADR-0018: o mono-titular continua suportado, mas não é mais a regra. Consequência
   assumida: predicado de RLS maior e matriz de autorização com o eixo papel.
2. **Pagamentos fora de escopo por decisão do Bruno em 2026-09-08** (E10-S02/S03/S04) × pedido de
   integração em 2026-10-02. A orientação que faltava chegou: Global Pays (Brasil) e QuickBooks (EUA).
   E10-S03 reabre com essa orientação; E10-S02 (cartão salvo/recorrência) segue fora — o parcelamento
   é escolha do cliente na plataforma de pagamento, não controle da Akros.
3. **"IA não aprova"** (assumption da spec) × pedido de IA no dia a dia. Sem conflito: ele manteve
   confirmação humana para documento e resposta. O que muda é que a IA deixa de estar fora de escopo
   e passa a ter story própria. Envio automático de resposta de expectativa, que ele quer "no futuro
   quando houver confiança no agente", continua fora até existir medição dessa confiança.
4. **Cadastro manual pela equipe** × cadastro gerado pelo contrato. Incorporado como contrato
   estruturado; a geração automática a partir do PDF assinado depende de E07-S05.
5. **Gamificação**: o manual do EB-2 NIW é a base, mas não é artefato do repositório. Tratado como
   insumo a cadastrar no programa, não como código.

## O que já existe e o que falta

- `crm/interfaces/Clientes360RealPage.tsx`: lista e detalhe reais, abas e indicadores; linha 310
  informa operação somente leitura. Não confundir tela disponível com operação concluída.
- `documentos/interfaces/DocumentosRealPage.tsx`: consulta real; upload e assinatura bloqueados.
- `documentos/domain/types.ts`: requisitos, estados documentais e revisão; URL de arquivo ainda modelada como mock.
- `jornada/domain/types.ts`: programa/versionamento, fases, etapas e dono cliente/Akros/terceiro/USCIS.
- `pagamentos/domain/types.ts`: pendente, em conferência, pago, divergente e atrasado; conciliação humana já prevista.
- E04-S12 e E04-S13: pasta/conta Microsoft e caminho exibido são referências da demo, sem OAuth e binário reais.
- E13-S11 e `docs/STATE.md`: boa parte migrou para leitura Supabase; mutações aguardam fluxo seguro.
- E12-S04 em `specs/002-login-convite-supabase/`: convite por administrador já especificado, ainda Draft.
- `docs/PROJECT.md` conserva descrição da fase de protótipo; comparar com código e STATE para avaliar estágio atual.
- Não existe `graphify-out/graph.json` neste checkout; descoberta realizada nos arquivos e specs.

## Escolha de abordagem

1. **Recomendação: fluxo completo pequeno.** Piloto com poucos casos, 360, portal, documentos reais
   no OneDrive e conciliação manual. Valida a operação inteira e cria dados úteis para o painel.
2. **360 interno primeiro.** Cadastro e pendências manuais dão visibilidade mais cedo, mas equipe
   continua recebendo e transferindo arquivos. Pode ser primeira entrega intermediária.
3. **Automação ampla desde início.** Sincronização bidirecional, importação em massa, financeiro integrado
   e resumos por IA aumentam dependências e custo de conferência. Reservar para etapas posteriores.

## Experiência proposta

**360 interno**: cabeçalho com programa, fase, responsável, última ação e próxima ação. Logo abaixo,
fila "O que precisa de atenção": documento faltante, documento em revisão, ajuste solicitado,
pagamento vencido e prazo de etapa. Abas atuais guardam o detalhe, sem esconder impedimentos.

**Portal**: jornada publicada e lista "O que preciso fazer agora"; cada solicitação explica requisito,
formato aceito, prazo e como enviar. Cliente acompanha recebimento, armazenamento e revisão como
situações distintas. Recebido não significa aprovado; comprovante não significa pagamento pago.

**Carteira**: casos por programa/fase/responsável, aguardando cliente, aguardando Akros, terceiros,
USCIS, revisões pendentes, vencimentos e cadastros incompletos. Cada indicador abre seus casos.
Primeira versão deve priorizar fila de trabalho e filtros sobre quantidade de gráficos.

Exemplo fictício: "Ana — EB-2 NIW — Fase 2. Falta carta de experiência (cliente); Business Plan
aguarda revisão (Akros); parcela vencida. Próxima ação: revisar Business Plan, responsável Natália."
No portal, Ana vê somente informações publicadas e instruções para suas ações.

## Regras para evitar resumo enganoso

- Mostrar dimensões simultâneas: documental, financeira e operacional. Um semáforo único não explica o caso.
- Faltante = requisito obrigatório aplicável sem versão aprovada. Exibir separadamente não enviado,
  aguardando revisão e ajustes; não somar esses grupos como se fossem pendências diferentes do mesmo requisito.
- Não cobrar requisito de fase bloqueada como tarefa executável do cliente.
- "Aguardando Akros" inclui envio aguardando revisão; "aguardando cliente" inclui envio ou ajuste solicitado.
- Vencimentos próximos: sugestão de janela de 7 dias corridos, ainda a validar com equipe.
- Falta de dados, consulta incompleta e cadastro sem conferência não produzem "em dia".
- Última atividade não substitui prazo: atraso nasce de vencimento explícito. Alertas por inatividade
  exigem limiares validados antes de entrar no escopo.
- Totais monetários sempre separados por BRL e USD; valores e taxas são cadastrados por caso.
- Indicadores de carteira devem usar exatamente os mesmos critérios do detalhe e expor sua atualização.

## Sequência de desenvolvimento

### 0. Fundação para operar

Concluir/reusar E12-S04 **com convite por participante e papel**; resolver A-02 nas tabelas tocadas;
validar vínculo participante/conta, refresh e revogação. Inventariar permissões e ambiente atual.
Exercitar isolamento entre dois casos **e entre dois papéis do mesmo caso** antes de permitir
alterações reais.

**Saída**: equipe convida por papel, participante entra e nenhuma chamada direta burla permissões.

### 1. Contrato, participantes e papéis

Registrar contrato (programa, participantes e papéis, condições financeiras, prazos de resposta,
prioridade contratual) e derivar dele cadastro e cobranças, com origem registrada. Declarar papéis,
requisitos dirigidos e requisitos restritos na versão do programa; congelar no caso. Provar
visibilidade por papel em SQL antes de qualquer tela de documento.

**Saída**: caso R com igreja e beneficiário preparado, cada papel vendo só o que lhe cabe.

### 2. Cadastro operacional e jornada

Preparar caso, responsável, fase atual e solicitações por papel/familiar. Publicar próxima ação,
separar notas internas e histórico visível, habilitar aprovação/devolução e liberação de fases, com
a fase seguinte oculta até a atual concluir. Reaproveitar portas/adapters existentes; transições
validadas e auditadas no servidor.

**Saída**: equipe mantém um caso real e cada participante acompanha tarefas e avanço coerentes.

### 3. Documentos e OneDrive

Conectar conta autorizada da Akros, vincular pasta existente ou criar para novo caso, implementar
recebimento protegido, armazenamento, revisão e versões. Validar formato/tamanho e conteúdo antes
de disponibilizar arquivo. Adotar IDs de drive/item como referência; nome serve à exibição.

Decisão técnica a fechar no plano: recebimento temporário protegido com processamento persistente
ou upload controlado por sessão. Definir expiração/limpeza do temporário, limites, inspeção de arquivo
e operação de recuperação. Não confirmar recebimento sem binário durável; não declarar arquivo
no OneDrive antes de confirmação. Repetir operação deve recuperar o mesmo envio sem duplicar.

Cliente não fornece caminho arbitrário nem credenciais Microsoft. Consulta/download passam pela
autorização da plataforma; não criar links públicos. Verificar associação caso/pasta no servidor.
Falha de conexão exige orientação para reconectar; renomeação usa IDs, remoção vira erro visível.

**Saída**: ciclo PDF solicitado, envio, arquivo na pasta correta, ajuste, nova versão e aprovação;
falha de rede/Microsoft é recuperável e não perde arquivo confirmado.

### 4. Financeiro operacional

Cadastrar cobranças, dados de recebimento validados, comprovantes usando fluxo protegido de arquivos,
conciliação manual e divergência. Registrar decisão financeira no servidor. Definir tratamento de
pagamento parcial antes de suportá-lo; MVP mantém o valor recebido e marca divergência.

**Saída**: cliente acompanha e anexa; equipe confirma; total e status concordam em todas as telas.

### 5. Resumo da carteira e avanço publicado

Centralizar critérios de pendência e vencimento, lista filtrável, indicadores com detalhamento e
rotina de prioridades. Cruzar situação financeira com fase, como o Bruno pediu, usando as cobranças
cadastradas — previsão de recebimento e visão de faturamento ficam em E10-S03. Publicar percentual de
avanço e estimativa de protocolo no portal, com critério e data de cálculo. Implementar agregação sem
carregar toda a base e todos os arquivos no browser; estratégia depende de volume e consultas medidos
no plano.

**Saída**: equipe abre cada indicador e chega exatamente aos casos/itens que compõem o total.

### 6. Piloto e adoção

Público confirmado pelo usuário em 2026-10-02: clientes atuais, com piloto pequeno. Programas
definidos em 2026-10-06: **EB-2 NIW e visto R**, cerca de três casos com contrato ativo — de
preferência um EB-2 NIW no começo do processo, bom para exercitar gamificação e fluxo documental, e um
R para exercitar papéis e visibilidade. E-2 fica fora, por ser não imigrante e de natureza diferente.
**Gate do R**: manual do visto R escrito e cadastrado como programa.
Equipe registra
situação inicial, vincula pastas, valida requisitos e pagamentos; não interpreta automaticamente
nome de pasta como fase concluída. Definir data em que atualizações desses casos passam pelo produto.

Executar fluxo real com arquivos fictícios em ambiente autorizado, depois acompanhar piloto com
Bruno e Natália. Critérios: metas SC-001 a SC-005 e zero divergência de vínculo/arquivo/status.
Expandir cadastro gradualmente após equipe conferir a situação dos casos do piloto.

## Verificação prevista

- Testes de regras e transições: cliente envia, equipe decide; requisitos e moedas corretos.
- Testes SQL de permissões, leitura cruzada, auditoria e tentativa de mudar status direto.
- Integração Microsoft: pasta existente/nova, colisão de nome, nova versão, indisponibilidade,
  credencial revogada, falha após arquivo salvo e retomada sem duplicidade.
- E2E autenticado: convite, portal, upload, revisão, comprovante, conciliação e carteira.
- i18n PT-BR/EN e checklist impeccable das telas; acessibilidade e uso em celular para envio.
- `ci:local`, matriz de auth/RLS e revisão adversarial antes de PASS. Rollout pelo papel @devops.

## Evoluções após operação confiável

Ordem recomendada depois desta story, na prioridade que o Bruno declarou:

1. **E07-S05 — IA de apoio ao processo**: pré-análise de documento (como chegou, legibilidade,
   qualidade), cruzamento com os requisitos do visto, rascunho de resposta ao cliente e tom de gestão
   de expectativa. Confirmação humana obrigatória para documento e para resposta. Gates: mascaramento
   de PII na infraestrutura da Akros, provedor dedicado com chave exclusiva no Vault, evals,
   versionamento de prompt e OWASP LLM Top 10. Prioridade paga lida do contrato.
2. **E10-S03 — QuickBooks e Global Pays**: geração de link, acompanhamento de recebimento (D+1),
   conversão, previsão de recebimento e visão financeira administrativa cruzada com a fase.
3. **E10-S05 — Agente financeiro de cobrança**: lembretes por WhatsApp e e-mail institucional,
   leitura da situação do caso e do contrato, separado de quem cuida do caso.
4. **E08-S04/S05 — Comunicação centralizada real**: registro unificado de WhatsApp, e-mail e portal
   como prova, chat no sistema com uso em celular e canal reservado para assunto particular.
5. **Advogado parceiro**: pasta filtrada no OneDrive montada por comando, com regra explícita do que
   pode sair — nada financeiro, nada do 360 completo.
6. Resumo narrativo por cliente e resumo diário da carteira, com fonte e data em cada afirmação.
7. Importação assistida do acervo e múltiplos processos por cliente, conforme demanda confirmada.

## Pesquisa Microsoft e decisões a fechar

OneDrive empresarial da Akros confirmado pelo usuário em 2026-10-02. Vincular as pastas existentes
dos casos do piloto; conta proprietária e pasta autorizada serão identificadas no preparo técnico.

Microsoft Graph documenta sessões de upload e permissões selecionadas. Isso confirma mecanismos
disponíveis, mas não define qual autorização cabe à conta atual da Akros. O plano deve validar
pasta autorizada, permissões mínimas e comportamento real antes de escolher a integração.

- [Sessões de upload](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0).
- [Permissões selecionadas](https://learn.microsoft.com/en-us/graph/permissions-selected-overview).

Decisões de público, armazenamento e modelo familiar resolvidas. Preparar `plan.md`
com Constitution Check, pesquisa/modelo de dados/contratos e ADR para integração/modelo persistente
quando necessário; então gerar tasks por entrega e analisar consistência. Specs independentes
adicionais serão abertas se o refinamento confirmar subsistemas que precisam de ciclos próprios.
