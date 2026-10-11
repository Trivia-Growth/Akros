# Research — Cliente 360 operacional

**Story**: E03-S07 · **Data**: 2026-10-02, revisado em 2026-10-06 · **Estado**: decisões de desenho
propostas; itens 5 a 7 vêm da resposta do Bruno de 2026-10-02.

## 1. Aproveitar operação existente

**Decision**: ampliar módulos existentes, preservando UUIDs e programas/versionamento.
**Rationale**: 360 e portal já consultam Supabase; lacuna está nas mutações e binários.
**Alternatives considered**: CRM paralelo criaria dois cadastros e resumos divergentes.

Evidências locais: `Clientes360RealPage.tsx` indica leitura apenas; `DocumentosRealPage.tsx`
bloqueia upload; migrations 0003/0005 permitem UPDATE próprio sem validar transições; 0001 contém
familiares em `perfil_imigratorio`; 0008 tem auditoria com `auth.uid()`.

## 2. Autorização Microsoft

**Decision**: propor OAuth delegado da conta proprietária corporativa; validar tenant/consentimento
antes de rollout. Token no Vault; servidor restringe operações à pasta autorizada.
**Rationale**: API de upload documenta `Files.ReadWrite` como menor permissão delegada para conta
corporativa; autorização final depende das permissões da conta. O escopo não isola uma pasta sozinho.
**Alternatives considered**: acesso application amplo não adotado; permissões Selected são alternativa
se política corporativa exigir concessão por recurso, com configuração e prova próprias.

Fontes consultadas em 2026-10-02: [upload e permissões](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0),
[Selected permissions](https://learn.microsoft.com/en-us/graph/permissions-selected-overview).

## 3. Recebimento durável antes de transferir

**Decision**: bucket Supabase privado para receber e fila persistente Postgres para transferir.
**Rationale**: confirmação ao cliente não pode depender da disponibilidade Microsoft; arquivo
recebido continua recuperável durante falha. TUS proposto para PDF até 20 MB e redes móveis.
**Alternatives considered**: envio direto ao Graph simplifica cópia, mas confirmação e validação
ficam mais acopladas ao serviço externo; tarefa em memória não garante recuperação.

Supabase recomenda TUS acima de 6 MB; documentação orienta novos caminhos em vez de overwrite.
[Storage uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads).

## 4. Transferência retomável e limites de execução

**Decision**: processador com lease, checkpoint e sessão Graph; usar Cron para retomar tarefas,
com identidade e destino determinísticos. Conferir existência/tamanho/checksum aplicável do item
antes de repetir envio quando houve resposta perdida.
**Rationale**: Edge Functions têm duração/memória finitas; recuperação não pode depender de processo vivo.
Graph permite retomar envio sequencial; fragmentos intermediários devem ser múltiplos de 320 KiB.
**Alternatives considered**: worker externo e broker separado acrescentam operação desnecessária ao piloto.

Fontes: [limites Edge Functions](https://supabase.com/docs/guides/functions/limits),
[Cron](https://supabase.com/docs/guides/cron),
[sessão Graph](https://learn.microsoft.com/en-us/graph/api/driveitem-createuploadsession?view=graph-rest-1.0).

## 5. Participantes, papéis e visibilidade

**Decision**: `Participante` vira entidade do caso, com papel declarado na versão do programa;
autorização do portal resolve participação ativa no servidor e a visibilidade de requisito/documento
segue o papel, negada no banco (ADR-0018). Familiar de apoio continua referenciado por identidade
estável no perfil, sem conta própria obrigatória. Resumo segue projeção estruturada por domínio, com
os mesmos critérios no detalhe e na carteira, filtrada por papel antes de montar o DTO.
**Rationale**: o visto R tem igreja aplicante e indivíduo beneficiário, e os vistos com empregador
exigem documento da empresa invisível ao empregado — característica do visto, não da operação.
**Alternatives considered**: titular único tratando igreja como "familiar" (vaza documento restrito por
desenho); um caso por participante (duplica jornada e conta o mesmo processo duas vezes); papel
digitado caso a caso (erro de clique vaza documento restrito).

## 6. Contrato como origem do cadastro

**Decision**: contrato entra como **registro estruturado** na plataforma — programa, participantes e
papéis, condições financeiras, prazos de resposta e prioridade contratual — com o PDF assinado anexado
pelo mesmo fluxo protegido de arquivos. Cadastro, participantes e cobranças derivam desse registro,
com origem rastreável; campo ausente vira cadastro incompleto, nunca valor presumido.
**Rationale**: Bruno quer o cadastro nascendo do contrato, e as condições de pagamento já estão nele.
O formato de entrada era pergunta aberta dele; o registro estruturado é o único caminho que não
depende de extração por IA, que ficou em E07-S05.
**Alternatives considered**: ler o PDF assinado por IA e preencher o cadastro (depende do gate de PII e
de provedor dedicado; entra depois, sobre a mesma estrutura); manter cadastro 100% manual (contraria o
pedido e mantém a cobrança desconectada do contrato).

## 7. Dados sensíveis e IA (gate para E07-S05)

**Decision**: nenhum arquivo de cliente vai a provedor de IA nesta story. Para a story de IA, o gate é:
mascaramento de PII executado na infraestrutura da Akros antes da chamada, provedor **dedicado à
análise** e chave exclusiva dessa finalidade no Vault, registro de qual versão de arquivo foi a qual
provedor e desligamento por caso.
**Rationale**: decisão do usuário em 2026-10-06, atendendo à pergunta 2 do Bruno (contrato de dados,
retenção e privacidade). A chave BYOK do agente de atendimento (OpenRouter, E13-S12) **não** serve:
roteia a modelos de terceiros sem contrato da Akros.
**Limite técnico declarado, não resolvido**: mascaramento não cobre tudo que o Bruno pediu. A
pré-análise de "como o arquivo chegou, se está legível, qualidade geral" opera sobre a imagem/página —
mascarar passaporte apaga exatamente o que seria conferido. Caminhos a avaliar em E07-S05, na ordem:
(a) checagens de legibilidade/qualidade feitas localmente, sem provedor externo (resolução, páginas,
PDF pesquisável, borda cortada, borrão); (b) OCR local e envio apenas de texto com PII mascarada para
o cruzamento com os requisitos do visto; (c) para o que exigir a imagem, provedor dedicado com
contrato de processamento de dados e retenção zero, decidido em ADR próprio, sem mascaramento possível.
Não anunciar "PII mascarada" para um fluxo que envia a imagem.
**Alternatives considered**: enviar tudo com BYOK atual (sem base contratual para passaporte e
documento fiscal); modelo local para tudo (custo de infraestrutura e qualidade a provar antes).

## Gates operacionais não exercitados

Tenant, conta proprietária, consentimento, pasta, quota e conectividade reais ainda não foram
verificados. Manual e programa do visto R, APIs de QuickBooks/Global Pays e API de WhatsApp também
não — os dois últimos são insumos de E10-S03/E10-S05, não desta story. Pesquisa confirma capacidades documentadas, não autorização concedida no ambiente.
Seleção de casos, metas e defaults de tamanho/expiração permanecem propostas para revisão.
