# Contracts — operações propostas

**Story**: E03-S07 · Revisado em 2026-10-06 (ADR-0018). Contratos de comportamento; nomes não
representam endpoints já existentes.

## Regras comuns

Sessão válida, acesso ativo e papel obrigatório. Cookie exige CSRF; entrada Zod strict, rate limit,
erros RFC 7807 sanitizados. Participante nunca escolhe `clienteId`, `participanteId` ou `papel` para
obter acesso: o servidor resolve caso e papel pela participação ativa da sessão. Requisito restrito a
outro papel responde como inexistente, sem revelar nome, tamanho ou metadados.
Comando aceita idempotency key; mesma chave/conteúdo recupera resultado, chave com conteúdo diferente
retorna conflito. Transições recebem revisão esperada e retornam 409 em concorrência obsoleta.
URLs de autorização/upload com capability não são registradas em logs, auditoria ou respostas de erro.

## Operações de equipe

- **RegistrarContrato**: caso, programa/versão, participantes e papéis, condições financeiras (valor,
  moeda, parcelas, vencimentos), prazos de resposta, prioridade contratual e versão do arquivo assinado
  quando houver. Retorna o que foi derivado (participantes, cobranças propostas) e o que falta; campo
  ausente vira lacuna, nunca valor presumido. Alteração cria registro novo e não reescreve cobrança
  já conciliada.
- **PrepararCaso**: cliente existente, contrato de origem, programa/versão, responsável, fase inicial,
  levantamento, solicitações por participante/familiar/caso e origem. Retorna jornada, revisão e lacunas.
- **ConvidarParticipante**: caso, sujeito, papel declarado pela versão do programa e se recebe acesso ao
  portal. Reusa E12-S04 para o convite; papel fora do conjunto do programa é recusado. Registra quem
  convidou e quando.
- **RevogarParticipante**: participação específica; encerra envio, consulta, download e retomada apenas
  dessa participação, sem afetar as demais.
- **VincularPasta**: caso e identificador de pasta escolhida dentro da conexão autorizada;
  servidor verifica drive, ancestralidade, permissões e associação. Nunca aceita caminho arbitrário.
- **SolicitarDocumento**: fase/requisito/sujeito/papel dirigido/prazo/instrução; sujeito precisa
  pertencer ao caso. Marca de restrito é copiada do programa, não digitada livremente.
- **RevisarDocumento**: documento, versão, decisão aprovado/ajustes, motivo quando ajustes e revisão esperada.
- **DecidirEtapa**: etapa, aprovar/devolver, motivo da devolução e revisão; verifica requisitos do caso.
- **LiberarFase**: fase e revisão; anterior concluída. Sem override de requisito obrigatório no MVP.
- **CadastrarCobranca**: caso, descrição, tipo, valor decimal, BRL/USD e data de vencimento.
- **ConciliarPagamento**: pagamento, comprovante, decisão pago/divergente, valor recebido, motivo e revisão.
- **ReprocessarArquivo**: versão bloqueada; autorizado só à equipe, recupera trabalho existente.
- **RegistrarNotaInterna**: caso e conteúdo; leitura/escrita admin-only, nunca incorporada ao DTO do portal.

## Operações do participante

- **ConsultarMeuCaso**: sem ID arbitrário; retorna situação publicada do caso de que participa, no que
  o papel alcança — documentos por sujeito, pagamentos, tarefas da **fase liberada**, percentual de
  avanço com critério, estimativa de protocolo ou motivo de "sem previsão" e eventos publicados. Sem
  notas internas, sem requisito restrito a outro papel e sem segredo técnico. Tarefa de fase não
  liberada não é retornada nem consultável por ID.
- **ReservarEnvio**: solicitação ou pagamento, nome, tamanho e tipo. Retorna versão/reserva,
  objeto permitido e validade; autenticação atual necessária para escrita no Storage.
- **FinalizarEnvio**: reserva, revisão esperada e idempotency key; servidor verifica objeto e vínculo;
  retorna versão, recebidoEm e estado de armazenamento somente após confirmação durável.
- **EnviarEtapaParaAvaliacao**: etapa da própria jornada liberada; move pendente para em_analise,
  sem completar etapa nem liberar fase.
- **ConsultarEnvio**: versão autorizada; recebido, armazenamento e decisão de revisão em campos separados.
- **BaixarArquivo**: versão publicada/autorizada; entrega attachment por serviço que verifica sessão
  ativa, sem expor drive global, URL pública ou credencial Microsoft.

Equipe também pode enviar documento pelo mesmo contrato, com autoria explícita e seleção de caso
autorizada. Requisito de envio conjunto aceita qualquer participante autorizado pelo programa, com
autoria registrada; requisito dirigido a um papel recusa envio de outro.

## Carteira e 360

- **ConsultarCarteira** (admin): busca, programa, fase, responsável, tipo/dono da pendência,
  prazo e cursor; retorna página, totais completos por critério e atualização.
- **ConsultarCliente360** (admin): ID autorizado; busca só entidades do caso, com paginação do
  histórico. Mostra participantes, papéis, contrato de origem e prioridade contratual. Toda a equipe
  alcança o caso; responsável interno não filtra leitura.
- Carteira cruza situação financeira (em dia/atrasado) com a fase. Previsão de recebimento e visão de
  faturamento não pertencem a este contrato (E10-S03).
- Indicador mantém filtros que produziram total; mesmo critério usado no detalhamento.
- Dado não carregado é erro/lacuna; não representar como lista vazia ou valor zero.

## Integração Microsoft e processador

- Iniciar conexão é admin-only; callback valida state/PKCE e sessão vinculada à tentativa.
  Tokens ficam no Vault; resposta indica conexão/conta/pasta, sem token.
- Processador é interno, autenticação própria por segredo em Vault; não aceita `clienteId`,
  `driveId` ou URL livre de caller público. Obtém versão/destino do trabalho reservado no banco.
- Sessão Graph e URL temporária de download são capacidades secretas; referências sensíveis
  ficam protegidas e são descartadas ao concluir/expirar, sem registro na timeline.
- Operação remota sem resposta não vira sucesso presumido: reconciliar item esperado e tamanho/hash
  aplicável, ou bloquear para investigação; jamais criar nova versão para mascarar tentativa repetida.

## Erros previstos

401 sessão inválida; 403 papel/vínculo/acesso revogado ou papel sem autoridade para a operação; 404
para requisito restrito a outro papel e para tarefa de fase não liberada (não 403, que confirmaria a
existência); 409 estado obsoleto, vínculo conflitante ou idempotência incompatível; 413 acima de 20 MB;
422 formato/requisito inválido ou papel fora do conjunto do programa; 429 limite de uso.
Falha Microsoft após recebimento retorna estado pendente/falhou na consulta, sem desfazer confirmação.
No portal, consultas de entidade inacessível não revelam nome/dados do outro cliente.
