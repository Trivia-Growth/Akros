# Data Model — Cliente 360 operacional

**Story**: E03-S07 · **Estado**: modelo proposto, revisado em 2026-10-06 (ADR-0018); DDL pelo papel
@data-engineer, sem migration criada.

## Reuso e compatibilidade

Manter `crm.clientes`, `jornada.jornadas/fases/etapas`, `documentos.documentos`,
`pagamentos.pagamentos` e `audit.eventos`. Não recriar cadastro ou remapear UUIDs.
`url_mock` não representa arquivo real. Família segue no perfil atual, com IDs estáveis;
servidor verifica familiar incluído no caso e preserva referências históricas quando inativado.

Acesso do portal deixa de depender de `cliente_id` do claim e passa a resolver participação ativa no
caso (ADR-0018). Caso com um único participante aplicante continua suportado; jornada histórica
mono-titular não é reescrita.

Piloto tem uma jornada operacional escolhida por cliente. Inventário anterior verifica duplicatas;
não aplicar UNIQUE global nem apagar jornadas históricas para forçar regra do piloto.

## Extensões propostas

- **Cliente/caso**: jornada operacional, contrato de origem, estado de levantamento
  incompleto/conferido, quem conferiu, quando e origem da situação inicial. Próxima ação publicada e
  notas internas têm armazenamento separado.
- **Participante**: caso, sujeito (pessoa do perfil, familiar ou organização), papel do programa,
  vínculo de acesso opcional, estado ativo/revogado, quem convidou e quando. Papel pertence ao conjunto
  declarado pela versão do programa do caso; participante sem vínculo de acesso é válido.
- **Organização participante**: razão social/nome, identificador fiscal quando houver e contato. É
  sujeito do caso, não inquilino: sem `org_id` e sem agrupar casos (ADR-0009 segue valendo).
- **Papéis e restrições do programa** (dentro do template versionado, ADR-0004/0014): papéis
  existentes, obrigatórios, requisito dirigido a cada papel, requisito **restrito** a um papel e se o
  envio é individual ou conjunto. Caso congela a `programaVersao`.
- **Contrato**: caso, programa e versão, participantes e papéis, condições financeiras (valor, moeda,
  parcelas, vencimentos), prazos de resposta, prioridade contratual, autor, data e versão do arquivo
  assinado quando houver. Alteração gera registro novo, sem reescrever cobrança já conciliada.
- **Progresso e estimativa**: projeção derivada — percentual de requisitos/etapas concluídos, critério,
  base de datas de entrega, data do cálculo e motivo de "sem previsão". Não é tabela editável.
- **Etapa**: prazo explícito opcional e revisão concorrente; duração média existente não vira vencimento.
- **Solicitação documental**: documento existente representa requisito solicitado; ligar jornada/fase,
  requisito, sujeito (`caso`, `participante`, `familiar`), identificador do sujeito quando aplicável,
  papel dirigido, marca de restrito e prazo opcional. Restrição vem do programa; a solicitação guarda a
  cópia efetiva para que a visibilidade não dependa de releitura do catálogo.
  Para legado sem essas referências, marcar pendência de levantamento, sem inventar vínculo.
- **Versão de arquivo**: UUID, cliente/jornada, documento ou pagamento, número da versão,
  nome original, MIME validado, tamanho, hash, autor, recebido_em, objeto temporário,
  drive_id/item_id finais e estados de recebimento/armazenamento. Exatamente um destino de negócio;
  único (documento, número da versão), referência ao mesmo cliente em toda a cadeia.
- **Reserva de envio**: versão reservada, objeto permitido, tamanho/tipo declarados, expiração,
  titular/admin autor e idempotency key. Upload não autorizado fora dessa reserva; sem overwrite.
- **Vínculo pasta**: cliente/jornada, integração Microsoft, drive_id, folder_item_id, autor,
  data de validação e estado ativo/bloqueado. Nome e caminho são exibição, sem autorização por string.
- **Trabalho de transferência**: versão única, estado, tentativas, próxima tentativa, lease,
  checkpoint, referência secreta da sessão, resultado remoto e erro sanitizado. Dados técnicos admin-only.
- **Nota interna**: cliente/jornada, conteúdo, autor/data; RLS admin-only. Não colocar em JSON
  acessível por SELECT do cliente nem ocultar somente na UI.
- **Decisão de revisão**: versão exata, decisão, justificativa, autor e data; append-only.
  Nova versão invalida uso de aprovação anterior para satisfazer requisito, sem apagar a decisão antiga.
- **Pagamento**: preservar valor numeric/moeda/vencimento/status; comprovante referencia versão protegida,
  não URL pública. Valor recebido e motivo de divergência; confirmação por usuário UUID.

## Estados

- Documento: pendente, enviado, em_analise, aprovado, ajustes (vocabulário existente).
- Versão: reservada, recebida ou rejeitada; armazenamento separado pendente, transferindo, armazenado ou falhou.
- Etapa: pendente, em_analise, concluida; somente equipe decide último estado e liberação de fase.
- Pagamento: pendente/atrasado, em_conferencia, pago ou divergente; comprovante não confirma recebimento.
- Trabalho: pendente, em_execucao, concluido ou bloqueado; lease vencido permite retomada controlada.

Recebimento exige objeto durável validado. Documento pode aguardar revisão enquanto sua transferência
está pendente; revisão exige acesso autorizado à versão recebida. Armazenado exige item remoto confirmado.

## Invariantes e autorização

- Caso e papel derivados da sessão por participação ativa; sujeito, fase, documento e pagamento
  pertencem ao mesmo caso. Nenhum identificador de caso, participante ou papel vem do browser como
  fonte de autoridade.
- Requisito restrito a um papel: `SELECT` negado por RLS para participante de outro papel, inclusive
  por ID; comando de download repete a verificação. Nenhum papel de participante concede autoridade de
  equipe (aprovar, concluir etapa, liberar fase, alterar cobrança, conciliar).
- Equipe da Akros alcança o caso inteiro; responsável interno não restringe leitura da equipe.
- Cobrança referencia a condição contratual de origem; cobrança sem contrato correspondente é
  impedimento visível, não registro silencioso.
- Cliente não altera vínculo de acesso, status, cobrança, pasta, titularidade ou decisão por UPDATE direto.
- Perfil pessoal editável, se mantido, usa comando com allowlist; campos de processo permanecem protegidos.
- Comandos de revisão recebem versão/revisão esperada; lock/transação impedem aprovação de versão obsoleta.
- Situação inicial não produz eventos anteriores fictícios; data real de importação e origem ficam registradas.
- Transição e evento de negócio são atômicos. Audit de requisição usa JWT do autor; worker registra
  identidade do sistema e autor do envio explicitamente, sem fingir que `auth.uid()` será o cliente.
- Todas as tabelas novas com RLS FORCE, GRANT explícito e auditoria aplicável. Segredos nunca em campos auditados.
- Sem DELETE de registros de negócio; limpeza de objeto temporário é operação técnica após confirmação final.

## Projeções

Carteira agrega casos conferidos/incompletos, documentos por estado, pagamentos por moeda e vencimento,
etapas e respectivos donos, e cruza situação financeira (em dia/atrasado) com a fase. Previsão de
recebimento e visão de faturamento ficam em E10-S03. Projeção do portal é filtrada por papel antes de
montar o DTO: requisito restrito não entra na resposta, nem como contagem. Não criar tabela editável de "pendência" concorrendo com entidades de origem.
Usar mesmas funções de critérios nas projeções de detalhe/carteira. Consulta apresenta `atualizadoEm`,
lacunas e versão dos critérios; leituras paginadas não truncam os totais.

Preparar migração reversível em expansão: novos campos/tabelas, backfill conferido, novos comandos/UI.
Preservar leitura legada; rollout de escrita fica desligado até endpoints e policies estarem implantados.
