# Contratos: jobs assíncronos (Edge Functions internas)

Mesmo padrão de `arquivo-processar` (E03-S07/ADR-0019): `service_role` + segredo do Cron
(`requireServiceRole`), nunca chamado por sessão de usuário, lease/retry via
`arquivos.trabalhos_transferencia` ou tabela de controle equivalente.

## `documento-pre-analisar` (US1)

**Disparo**: quando `arquivos.versoes.estado_armazenamento` vira `'armazenado'` para uma versão
com `documento_id` não nulo (comprovante de pagamento não passa por pré-análise de documento).

**Entrada**: `{ versaoId: string }` (lido da fila, não do corpo de uma requisição HTTP pública).

**Faz**: lê o PDF do bucket/OneDrive já resolvido (porta já existente de leitura de arquivo), roda
as checagens do `research.md` item 3, grava `documentos.pre_analises`. **Nunca faz chamada de
rede para fora do domínio Supabase/OneDrive da Akros.**

**Saída**: linha em `documentos.pre_analises` (idempotente por `versao_id` — reprocessar a mesma
versão substitui o resultado, nunca duplica).

## `documento-ocr-cruzamento` (US2)

**Disparo**: manual, pela equipe, a partir da fila de revisão (`FilaRevisaoRealPage`) — **não**
automático a cada upload, porque é a etapa que gasta custo de provedor externo e `ia_apoio_ativa`
precisa valer no momento da decisão, não no momento do upload.

**Entrada**: `{ documentoId: string, versaoId: string }`.

**Faz, em ordem**: (1) confere `crm.clientes.ia_apoio_ativa` do caso — se `false`, responde 422
sem gastar nada; (2) confere que `documentos.pre_analises` para a versão não aponta problema
bloqueante (FR-011 — documento ilegível não vai a OCR); (3) roda OCR local (Tesseract.js) se
`tipo_conteudo = 'imagem_escaneada'`, ou extrai texto direto se `'texto_pesquisavel'`; (4) aplica
mascaramento (`research.md` item 5); (5) chama o provedor dedicado com o texto mascarado; (6)
grava `documentos.chamadas_ia` e atualiza `documentos.documentos.analise`.

**Saída**: `documentos.documentos.analise` atualizado (mesmo formato de `AnaliseDocumento`) +
linha em `documentos.chamadas_ia`.

**Falha do provedor externo**: grava `analise` com aderência ausente e motivo "parecer
indisponível — tente novamente" (FR-011); **não** registra `chamadas_ia` para a chamada que
falhou antes de enviar (só registra chamada que de fato saiu).

## `documento-rascunho-resposta` (US3)

**Disparo**: manual, pela equipe, só depois de `documentos.documentos.analise` já ter um parecer
(gerado por US2).

**Entrada**: `{ documentoId: string }`.

**Faz**: lê `analise` já existente + `crm.contratos.prazo_resposta_dias_uteis`/`prioridade` do
caso, monta o prompt estruturado do `research.md` item 7, chama o mesmo provedor dedicado (texto
já mascarado — o parecer não contém PII, a lacuna/sugestão é sobre o documento, não sobre a
pessoa), grava `documentos.rascunhos_resposta` e `documentos.chamadas_ia`.

**Saída**: linha em `documentos.rascunhos_resposta`.
