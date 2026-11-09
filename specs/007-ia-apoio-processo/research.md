# Research: IA de apoio ao processo (E07-S05)

## 1. Porta e adapter — troca do mock por fluxo real

**Decision**: estender `AnalisadorDocumentoPort` (já existe, `apps/web/src/features/documentos/application/ports.ts`)
em vez de criar uma porta paralela. Hoje ela só devolve `AnaliseDocumento` (aderência ao
requisito). Esta story acrescenta dois métodos novos na mesma porta — `preAnalisar` (US1,
legibilidade, sem IA) e `rascunharResposta` (US3) — e troca `MockAnalisadorDocumento` por
`SupabaseAnalisadorDocumentoReal` fora do modo demo, mesmo padrão porta/adapter de todo o
repositório (ADR-0002).

**Rationale**: a UI de fila de revisão (`FilaRevisaoRealPage`) e o painel de documentos já
consomem `AnaliseDocumento` por essa porta — reaproveitar evita duplicar o contrato e mantém a
invariante "o parecer nunca decide `Documento.status`" (ADR-0005) num único lugar.

**Alternatives considered**: porta nova `IAApoioPort` separada — rejeitada por duplicar a
decisão já tomada de onde mora "parecer de documento", sem ganho (as duas portas teriam que
coexistir na mesma tela).

## 2. Onde roda a pré-análise local (US1)

**Decision**: pré-análise de legibilidade roda como etapa do pipeline assíncrono já existente de
transferência de arquivo (`arquivo-processar`, E03-S07/ADR-0019), não de forma síncrona no
upload. Quando `arquivos.versoes.estado_armazenamento` vira `'armazenado'`, um job (mesmo padrão
de lease/retry de `arquivos.trabalhos_transferencia`) lê o arquivo do bucket, roda as checagens e
grava o resultado.

**Rationale**: parsing de PDF/imagem é potencialmente lento; Edge Functions têm timeout. O
pipeline de transferência já resolve retry, lease e backoff — reusar evita reconstruir essa
mecânica.

**Alternatives considered**: checagem síncrona dentro de `finalizar_envio` — rejeitada, aumentaria
a latência percebida pelo cliente no upload e arriscaria timeout da Edge Function.

## 3. Checagens de legibilidade sem visão computacional pesada

**Decision**: v1 cobre, com bibliotecas puras de parsing (sem binding nativo, compatíveis com
Deno): (a) número de páginas e se o PDF tem camada de texto pesquisável (`pdf-lib` ou
equivalente); (b) dimensões de página coerentes com papel A4/Letter (detecta corte grosseiro);
(c) resolução efetiva aproximada quando a página é imagem escaneada embutida — compara os pixels
da imagem decodificada à dimensão física da página (DPI efetivo), **não** uma análise de nitidez
por variância de Laplaciano.

**Rationale**: o ambiente de execução (Edge Function Deno) não tem OpenCV nem bindings nativos de
imagem; análise de nitidez de verdade exigiria visão computacional fora de alcance desta story.
A aproximação por DPI efetivo já captura o caso relatado pelo Bruno ("foto tremida" quase sempre
correlaciona com resolução baixa) sem essa dependência.

**Known limitation (documentar em `docs/SECURITY_DEBT.md` como dívida técnica, não de
segurança)**: borrão real (foco) não é detectado — só resolução baixa e corte de página. Se a
operação provar que isso gera falso-negativo relevante, entra ADR próprio para avaliar visão
computacional dedicada (escopo (c) do gate de PII, que já está fora desta story).

**Alternatives considered**: Tesseract.js/wasm para decidir legibilidade a partir do resultado de
OCR (se o OCR falha, está ilegível) — adiado para a US2 (ver item 4), porque aqui ainda não se
precisa de OCR, só de metadados do arquivo.

## 4. OCR local para extração de texto (US2)

**Decision**: Tesseract.js (wasm) executado como etapa do mesmo job assíncrono do item 2, não
numa Edge Function de requisição-resposta. Produz texto bruto, nunca a imagem, como entrada do
passo de mascaramento (item 5).

**Rationale**: é a opção de OCR que roda sem serviço externo (requisito do gate de PII — "OCR
local", research.md §7 anterior). Reaproveitar o job assíncrono evita o limite de tempo de uma
Edge Function de request-response.

**Risco técnico não resolvido, sinalizar antes de `/speckit-tasks`**: não há precedente no
repositório de rodar Tesseract.js dentro de uma Edge Function Supabase (memória/tempo de uma
function Deno são mais limitados que um worker dedicado). **Recomendação**: validar com um spike
de 1-2 documentos reais antes de comprometer a task de implementação; se não couber nos limites
de memória/tempo da Edge Function, a alternativa é um worker dedicado fora do Supabase (mesma
infraestrutura "da Akros", mas componente novo — decisão a registrar em ADR se for esse o
caminho, por ser mudança de infraestrutura).

**Alternatives considered**: enviar a imagem a um provedor de OCR externo — rejeitado, é
exatamente o caminho (c) que o research.md anterior já tirou do escopo (reenvia o problema de
"imagem com PII sai da Akros").

## 5. Mascaramento de PII antes de qualquer chamada externa

**Decision**: duas camadas, nessa ordem: (1) substituição determinística de valores já
conhecidos do cadastro do caso — nome completo do cliente e dos familiares
(`crm.clientes.perfil_imigratorio`), número de passaporte quando já capturado — por placeholders
estáveis (`[NOME_1]`, `[PASSAPORTE]`); (2) padrões estruturados por regex como rede de segurança
adicional para o que não está cadastrado (CPF, SSN, datas no formato numérico, números de
documento de 6+ dígitos). O texto mascarado é o único artefato que sai para o provedor externo.

**Rationale**: a camada 1 é mais confiável que NER genérico porque já sabe exatamente qual nome
procurar (é o nome do próprio caso) — não depende de um modelo de reconhecimento de entidade
acertar. A camada 2 cobre o que a camada 1 não sabe de antemão.

**Alternatives considered**: mascaramento só por regex (sem usar o cadastro do caso) — mais
simples, mas deixa passar nome completo com grafia que não bate um padrão regex (falso-negativo
mais provável que o plano com duas camadas).

## 6. Provedor de IA dedicado — decisão de negócio, tomada em 2026-11-06

**Decision**: OpenRouter, mesmo mecanismo técnico já usado pelo agente de atendimento
(E13-S12/BYOK, `configuracoes.integracoes`), **com uma chave exclusiva desta finalidade**
(`ia-apoio-processo`) — nunca a mesma chave configurada para o agente de atendimento — e seleção
de modelo pela plataforma (mesma UI de `agente-playground`/Configurações, reaproveitada). Decisão
do usuário em 2026-11-06.

**Rationale**: reaproveita um mecanismo já construído e testado (BYOK, troca de modelo pela UI,
Vault) em vez de integrar um SDK novo — menor superfície de código novo. A separação exigida pelo
gate (research.md §7 anterior) é por **chave**, não por mecanismo: duas chaves OpenRouter
distintas, cada uma só usada para sua finalidade, já isola o escopo de processamento de uma
finalidade da outra (cancelar/rotacionar a chave de análise de documento nunca afeta o agente de
atendimento, e vice-versa).

**Ressalva que fica registrada, não escondida**: OpenRouter é um agregador/roteador — o contrato
de processamento de dados e a garantia de retenção dependem do modelo/provedor escolhido *dentro*
da plataforma OpenRouter, não de um DPA único da Akros com um provedor final. Isto é diferente da
trava original do research.md ("sem contrato direto da Akros") — a mitigação aqui é a mesma já
aceita para o agente de atendimento (E13-S12 já envia conteúdo de cliente por esse mesmo caminho)
MAIS o mascaramento de PII desta feature (item 5), que já reduz o que sai em claro independente do
provedor escolhido na plataforma. Fica para a equipe de produto escolher, na UI de configuração,
um modelo/provedor com política de retenção adequada — a plataforma não impõe isso por código.

**Consequência arquitetural**: não há ADR bloqueando `/speckit-implement` por escolha de provedor
— o mecanismo já está aprovado (E13-S12). Implementação pode seguir sem esperar decisão externa.

**Alternatives considered (descartadas nesta decisão)**: Anthropic API direta e Azure OpenAI —
ambas exigiriam integrar um SDK novo e negociar DPA próprio; o usuário optou por reaproveitar o
mecanismo já existente em vez disso.

## 7. Rascunho de resposta calibrado pelo contrato (US3)

**Decision**: o prompt do rascunho recebe, como contexto estruturado (não como texto livre do
cliente): `prazoRespostaDiasUteis` e `prioridade` de `crm.contratos` do caso, o motivo da
pendência (lacunas do parecer da US2, nunca a imagem), e instrução explícita de nunca mencionar
prazo de decisão do USCIS. O texto gerado é um rascunho em estado de edição — nunca enviado sem
ação humana (FR-009).

**Rationale**: é a única informação de prazo que o sistema tem autoridade para citar (prazo
contratual da Akros, não o prazo do USCIS, que ninguém controla).

**Alternatives considered**: deixar o rascunho livre, sem template estruturado — rejeitado, risco
maior de a IA inventar prazo ou tom alarmista sem um guia explícito do que pode/não pode dizer.

## 8. Registro de auditoria de chamadas externas

**Decision**: nova tabela `documentos.chamadas_ia` (append-only, mesmo padrão de
`audit.eventos`/0008): `versao_id`, `provedor`, `finalidade` ('cruzamento_requisito' |
'rascunho_resposta'), `enviado_em`, sem guardar o conteúdo enviado (só metadado — o conteúdo
mascarado não precisa de retenção própria além do que o provedor já registra do lado dele).

**Rationale**: atende a FR-005 (qual versão foi a qual provedor, quando) sem duplicar dado
sensível numa tabela de auditoria nova.

**Alternatives considered**: guardar o texto mascarado enviado, para debug — rejeitado por
default: aumenta a superfície de retenção de PII (mesmo mascarada) sem necessidade comprovada;
pode entrar depois como opção configurável, não como padrão.

## Resumo dos itens que travam em ADR antes de `/speckit-implement`

1. ~~Provedor de IA dedicado~~ — resolvido em 2026-11-06 (item 6): OpenRouter com chave exclusiva,
   mesmo mecanismo do agente de atendimento. Não bloqueia mais.
2. Se o OCR local não couber numa Edge Function (item 4), decisão de infraestrutura para worker
   dedicado — único item que pode exigir ADR, e só se o spike confirmar que não cabe.

Nenhum item bloqueia `/speckit-tasks` ou `/speckit-analyze` neste momento.
