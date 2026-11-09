# Quickstart: validar E07-S05 ponta a ponta

Pré-requisitos: migrations desta feature aplicadas (`supabase db push`), as três Edge Functions
novas publicadas, chave do provedor de IA dedicado configurada no Vault (bloqueado por ADR — ver
`research.md` item 6; sem isso, só o cenário 1 abaixo é validável).

## Cenário 1 — pré-análise sem nenhuma chamada externa (US1, não depende do ADR)

1. Como cliente (ou via fixture), enviar um documento com página cortada ou resolução baixa pelo
   fluxo de upload já existente (`envio-comandos`).
2. Aguardar o job `documento-pre-analisar` processar (mesma fila de `arquivo-processar`).
3. Verificar `documentos.pre_analises` — a linha deve apontar `pagina_completa = false` ou
   `resolucao_suficiente = false` com `motivo_problema` preenchido.
4. Confirmar via log/trace que nenhuma chamada de rede saiu do domínio Supabase/Microsoft Graph
   durante o passo 2 (checagem manual nesta validação; não há automação de rede nesta story).
5. Repetir com um documento de boa qualidade — esperar `pagina_completa = true` e
   `resolucao_suficiente = true`.

**Prova FR-001/FR-002/SC-001.**

## Cenário 2 — desligar a IA de apoio bloqueia o cruzamento (US2, FR-010)

1. Como admin, chamar `definir_ia_apoio` com `ativa: false` para um caso.
2. Tentar disparar `documento-ocr-cruzamento` para um documento desse caso.
3. Esperar `422` sem nenhuma linha nova em `documentos.chamadas_ia`.

**Prova FR-010.**

## Cenário 3 — cruzamento com mascaramento (US2, depende do ADR de provedor)

1. Com `ia_apoio_ativa = true`, disparar `documento-ocr-cruzamento` para um documento com texto
   extraível (ex.: carta de recomendação com nome do cliente no corpo).
2. Inspecionar o payload efetivamente enviado ao provedor (log de debug local, nunca em
   produção) — confirmar que o nome do cliente aparece como `[NOME_1]`, não em claro.
3. Verificar `documentos.documentos.analise` atualizado e uma linha nova em
   `documentos.chamadas_ia` com `finalidade = 'cruzamento_requisito'`.

**Prova FR-003/FR-004/FR-005/SC-002/SC-004.**

## Cenário 4 — provedor indisponível não bloqueia a revisão humana (FR-011)

1. Com a chave do Vault temporariamente inválida (ambiente de teste), disparar
   `documento-ocr-cruzamento`.
2. Esperar `documentos.documentos.analise` marcado como indisponível, sem lançar erro que impeça
   a equipe de abrir e decidir sobre o documento na fila de revisão.

**Prova FR-011/SC-005.**

## Cenário 5 — rascunho reflete o contrato (US3, FR-008)

1. Gerar `documento-rascunho-resposta` para dois casos com o mesmo tipo de pendência, um com
   contrato `prioridade = 'prioritaria'` e outro `'padrao'`.
2. Comparar `documentos.rascunhos_resposta.prazo_resposta_dias_uteis_usado` entre os dois — deve
   refletir `crm.contratos.prazo_resposta_dias_uteis` de cada um, nunca um valor fixo hardcoded.
3. Ler o texto gerado e confirmar ausência de qualquer menção a prazo de decisão do USCIS.

**Prova FR-008/AC-1 da US3.**

## Cenário 6 — nada é enviado ao cliente sozinho (FR-007/FR-009, todas as US)

1. Repetir qualquer um dos cenários acima.
2. Confirmar que `documentos.documentos.status` não muda como efeito colateral do parecer, e que
   não existe nenhum caminho de código nesta feature que publique o rascunho num canal de
   comunicação com o cliente sem uma ação humana explícita fora desta feature.

**Prova SC-003 e a invariante central de ADR-0005.**
