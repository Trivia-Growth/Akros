# Implementation Plan: Cliente 360 operacional

**Story**: E03-S07 · **Date**: 2026-10-02, revisado em 2026-10-06 · **Spec**: [spec.md](spec.md)
**Status**: plano proposto; documentação, sem código ou rollout.
**Branch**: checkout atual `fix/E13-S14-erro-edge-function`; branch de implementação sugerida
`feat/E03-S07-cliente-360-operacional`, ainda não criada. Diretório da spec independe da branch.

## Summary

Operacionalizar o 360 existente com contrato, participantes por papel, jornada, documentos,
pagamentos e carteira. Piloto pequeno de clientes atuais em dois programas: EB-2 NIW e visto R.
Acesso do portal por participação ativa, com visibilidade por papel vinda da versão do programa
(ADR-0018). OneDrive empresarial da Akros é destino dos arquivos; Supabase mantém estados e histórico.
IA de apoio e integrações de pagamento ficam em stories próprias (E07-S05, E10-S03, E10-S05); esta
story entrega os dados reais e os ganchos.

Reusar E12-S04 para acesso. Receber arquivos em Storage privado, confirmar recebimento após
validação e persistência, e transferir ao OneDrive com trabalho persistente e recuperável.
Ações de negócio passam por comandos autenticados com validação, concorrência e auditoria.

## Technical Context

- **Language/Version**: TypeScript, React 19; SQL PostgreSQL e Deno nas Edge Functions existentes.
- **Primary Dependencies**: Vite, Supabase Auth/Postgres/Storage/Edge Functions, Microsoft Graph,
  react-i18next e UI existente. Reusar SDKs existentes; adicionar cliente TUS somente para envio retomável.
- **Storage**: tabelas por domínio; bucket privado temporário; arquivos finais no OneDrive corporativo.
- **Testing**: Vitest, testes SQL, Playwright autenticado e exercício real Microsoft com arquivos fictícios.
- **Target Platform**: web responsiva, portal e admin existentes, Netlify/Supabase.
- **Performance Goals**: entender caso em até 60 segundos; carteira paginada (50 casos por página),
  detalhe carregado por cliente; não baixar todas as entidades da carteira para montar um caso.
- **Constraints**: PDF até 20 MB (20.000.000 bytes), proposta técnica do piloto; validação server-side,
  sem sobrescrever versões. Revisão, conciliação e liberação humanas. Sem sincronização bidirecional.
- **Scale/Scope**: piloto pequeno confirmado; cerca de 3 casos em EB-2 NIW e visto R. Um processo
  operacional por cadastro do piloto, com 1 a 3 participantes por caso, sem migração massiva da base.
- **Operational prerequisites**: identificar conta/pasta, consentir app Microsoft, validar sessão real,
  concluir E12-S04 **com convite por participante e papel** e ter o programa do visto R cadastrado a
  partir do manual escrito pela Akros. São gates de execução externa, não suposições de acesso.

## Constitution Check

Verificação de desenho; não equivale a testes de implementação aprovados.

- **I — Spec**: FR-001 a FR-026 e cenários são contrato; decisões do usuário registradas; specs antigas intactas.
- **II — Dependências**: portas nos domínios; contratos de composição em `shared/`; Graph somente no servidor.
  Adapter atual do 360 cruza imports de features: substituir composição tocada por contratos compartilhados,
  sem reproduzir essa dependência no novo fluxo e sem refatorar módulos fora do escopo.
- **III — Segurança**: RLS FORCE/GRANT, revogar escrita direta de estados protegidos; comandos com
  autorização ativa, Zod strict, rate limit, CSRF quando por cookie; Vault para tokens; auditoria
  append-only. **Mudança de predicado (ADR-0018)**: autorização do portal deixa de ser `cliente_id` do
  claim e passa a ser participação ativa + papel, com requisito restrito negado no banco. Predicado
  maior exige pgTAP por papel; `crm.meu_cliente_id()` conviverá com o resolvedor de participação
  durante a migração e a dívida fecha nesta feature.
- **IV — AC**: testes de regras, SQL e E2E cobrem cada cenário; adversarial inclui falha parcial e acesso cruzado.
- **V — Linguagem/i18n**: PT-BR/EN; usar glossário; novos termos entram com implementação.
- **VI — UI**: impeccable, identidade existente, acessibilidade e verificação em browser.
- **VII — Rastreabilidade**: E03-S07 em artefatos/migrations/commits; plano respeita ownership do roadmap.

Após desenho: ADR-0018 registra a troca do predicado de acesso e mantém single-tenant (ADR-0009);
nenhuma outra exceção proposta. Antes de implementar, @architect registra ADR da integração
(autorização, recebimento temporário e recuperação); @data-engineer detalha DDL/RLS e reversão.
ADR de desenho ainda não escrito/aceito: gate aberto para implementação, sem alegar PASS definitivo.

## Project Structure

Documentos: `spec.md`, `refinamento.md`, `plan.md`, `research.md`, `data-model.md`,
`contracts/operacoes.md`, `quickstart.md`, `checklists/requirements.md`.
`tasks.md` vem na próxima etapa SDD, após revisão do plano; não é parte desta entrega de planejamento.

Áreas previstas, sem scaffolding realizado:

- `apps/web/src/features/crm/`: cadastro operacional, 360 e carteira, adapters com paginação.
- `apps/web/src/features/jornada/`: comandos de envio/decisão e liberação de fase.
- `apps/web/src/features/documentos/`: solicitações, versões, upload, revisão e consulta autorizada.
- `apps/web/src/features/pagamentos/`: cobrança, comprovante e conciliação.
- `apps/web/src/features/configuracoes/`: estado da conexão Microsoft, sem exibir segredo.
- `apps/web/src/shared/`: contratos entre domínios e infraestrutura compartilhada de arquivo.
- `supabase/functions/`: autorização Microsoft, comandos e processador de armazenamento.
- `supabase/migrations/`, `supabase/tests/`: extensões compatíveis e prova SQL de isolamento/transições.
- `apps/web/e2e/`: fluxo autenticado do piloto.

## Desenho do fluxo

1. Equipe registra contrato, deriva cadastro/participantes/cobranças, prepara situação inicial e valida
   vínculo de pasta; cadastro incompleto e contrato ausente ficam explícitos.
2. Participante escolhe solicitação; servidor deriva caso e papel pela sessão (participação ativa),
   verifica se o requisito é dirigido ou permitido ao papel, valida fase e sujeito e reserva versão.
3. Browser envia ao bucket privado com autenticação atual e política vinculada à reserva; sem URL
   pública nem credencial Microsoft. TUS permite retomada; política verifica acesso ativo em cada escrita.
4. Comando de finalizar verifica objeto, tamanho, conteúdo PDF e reserva ainda válida. Uma transação
   registra versão recebida, status documental e trabalho de transferência. Só então confirma recebimento.
5. Processador agendado adquire trabalho com lease e move arquivo ao OneDrive por sessão retomável.
   IDs e nome técnico determinístico evitam duplicação; falha depois do upload exige reconciliar item.
6. Confirmação do item final e atualização transacional marcam armazenamento concluído.
   Limpeza do temporário ocorre depois dessa confirmação; não apagar envio confirmado ainda não transferido.
7. Equipe revisa versão específica; comando confere revisão concorrente e registra decisão/histórico.
   Cliente envia etapa para avaliação; só equipe conclui etapa e libera fase elegível.
8. Comprovante usa mesma infraestrutura; entrada em conferência exige arquivo recebido duravelmente.
9. 360, portal e carteira consultam projeções dos mesmos estados, com atualização e lacunas explícitas.
   O portal aplica filtro por papel na projeção, não só na tela: requisito restrito não entra no DTO.
10. Percentual de avanço e estimativa de protocolo são funções puras sobre requisitos/etapas e datas de
    entrega, com critério e data de cálculo no retorno e "sem previsão" quando o histórico não sustenta.

### Arquivos, recuperação e conexão

Autorização inicial proposta: OAuth delegado da conta corporativa proprietária, `Files.ReadWrite`
e `offline_access`; segredo/refresh token no Vault. Restrição à pasta é validação adicional do
servidor: esse escopo não concede isolamento Microsoft só à pasta. Validar no tenant antes de rollout.
Se política corporativa exigir escopo selecionado, registrar ajuste no ADR e comprovar a operação;
não ampliar silenciosamente para todo SharePoint. Cliente final nunca conecta conta Microsoft.

Processador usa trabalho persistente em Postgres e agendamento Supabase Cron, com chamada autenticada
por segredo em Vault. Não depender de tarefa em memória após resposta da Edge Function.
Um arquivo por trabalho; fragmentos de 5 MiB, checkpoint e lease. Reprocessamento respeita backoff,
`Retry-After` e sessão expirada. Erros 401/403 pedem reconexão/verificação; quota ou pasta ausente
bloqueiam trabalho com motivo legível. UI permite repetir depois de corrigir causa.

Uploads incompletos expiram após 24 horas (proposta); temporários transferidos são limpos após
confirmação. Arquivos recebidos ainda pendentes de transferência não expiram automaticamente:
alerta operacional exige resolução. Downloads usam sessão ativa, autorização por entidade e
resposta de attachment; URL Graph pré-autenticada não é persistida nem entregue como link público.

## Entregas e critérios de saída

1. **Fundação**: E12-S04 com convite por papel e A-02; matriz de permissões e bloqueio de alterações
   diretas. Saída: dois casos isolados e dois papéis do mesmo caso isolados; participante não altera
   estados, participação e vínculo de pasta fora dos comandos permitidos.
2. **Contrato, participantes e papéis (US1/US6)**: contrato estruturado, participantes, papéis e
   restrições declarados na versão do programa e congelados no caso, convite por participante,
   predicado de participação e RLS de requisito restrito. Saída: caso R com igreja e beneficiário, com
   prova SQL de que nenhum papel lê o requisito restrito do outro.
3. **Caso e jornada (US1/US3)**: situação inicial, requisitos por papel/familiar, próxima ação, fase
   seguinte oculta até concluir a atual, notas internas, comandos e histórico. Saída: equipe prepara
   caso e controla etapa/fase com autoria.
4. **Arquivo e revisão (US2/US3)**: OAuth, pasta, Storage/RLS, transferência persistente, versões,
   download e UI. Saída: ciclo envio/ajuste/aprovação, falha Microsoft recuperável e nenhuma perda confirmada.
5. **Financeiro (US4)**: cobrança derivada do contrato, comprovante, divergência e confirmação. Saída: moeda e valor consistentes,
   comprovante não confirma pagamento; tentativa concorrente não duplica decisão.
6. **Carteira, avanço e estimativa (US5/US7)**: regras comuns, projeção SQL, busca, filtros, paginação,
   detalhamento, cruzamento de situação financeira com fase, percentual de avanço e estimativa de
   protocolo. Saída: indicadores reproduzidos a partir de seus casos, sem zero falso para cadastro
   incompleto, e nenhuma tela prometendo decisão do USCIS.
7. **Piloto**: validar seleção e cadastro com equipe; escolher data de adoção. Saída: SC-001 a SC-005
   exercitados, rotina operacional aprovada por Bruno/Natália e rollout pelo papel @devops.

Cada entrega inclui banco, servidor, adapter, UI e testes necessários; não habilitar botão sem
fluxo seguro completo. Usar testes primeiro nos comportamentos de negócio e segurança.
Sem estimativa de calendário até prova de conexão Microsoft e detalhamento das tasks.

## Riscos concretos e gates

- A-02 permite alterações próprias indevidas hoje: fechar antes de adicionar ações ao portal.
- Predicado novo de autorização é o maior risco desta story: enquanto `crm.meu_cliente_id()` e
  participação coexistirem, uma policy esquecida no caminho antigo expõe requisito restrito. Mitigação:
  teste SQL por papel em toda tabela tocada e remoção do caminho antigo dentro desta feature.
- Visibilidade restrita implementada só na UI ou só no DTO: documento fiscal de empresa vazaria por
  consulta direta. Mitigação: negar no banco e repetir a verificação no comando de download.
- Programa do visto R ausente bloqueia o piloto do R: a entrega 2 pode avançar com programa fictício de
  teste, mas o piloto real espera o manual.
- Esta story expõe ganchos de IA; ligar provedor sem o gate de PII/provedor dedicado é desvio de escopo
  e de segurança (decisão de 2026-10-06).
- Histórico importado pode parecer aprovado: registrar origem e conferência humana, com cadastro incompleto.
- Arquivo Microsoft criado antes de banco atualizado: reconciliar por identidade determinística, não reenviar cegamente.
- RLS atual não separa notas internas: manter notas em armazenamento admin-only e DTO explícito do portal.
- Consultas atuais carregam toda a base: implementar projeção/paginação e detalhe por ID, verificar totais completos.
- Integração real não foi exercitada: prova de OAuth/upload/download na pasta autorizada precede liberação do piloto.

Validação detalhada em [quickstart.md](quickstart.md). Gates continuam abertos até implementação;
este plano é resultado de desenho e pesquisa, sem testes de produto executados.
