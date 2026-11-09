# Research: Evolution confiável (E13-S15)

Fontes: TriviAtende `origin/main` `2a6d0ab7` (lido e testado em 2026-10-27: 154 testes Deno de canal
passaram); fonte oficial da Evolution (`main`, 2.3.7); documentação oficial da Meta (não usada aqui).
O que vem do TriviAtende é **hipótese** para o servidor do Akros até o smoke (D1).

| # | Decisão | Racional | Alternativas |
|---|---|---|---|
| D1 | **Smoke de contrato antes de ligar o agente** (`scripts/evolution-contract-smoke.mjs`): cria instância efêmera, prova as 7 capacidades, **apaga** a instância (`DELETE /instance/delete/{nome}`) | Servidor e versão do Akros são desconhecidos; o script do TriviAtende só faz logout e deixa a instância | Confiar na matriz 2.3.3: não vale para servidor novo |
| D2 | Matriz de compatibilidade **no banco**, editável pelo administrador (`configuracoes.evolution_compatibilidade`), sem seed | FR-004; nenhuma versão entra sem evidência | Constante no código (TriviAtende): troca de versão exige deploy |
| D3 | `webhook/set` com `{webhook:{enabled,url,headers,byEvents:false,base64:false,events}}` e **releitura** `webhook/find` comparando URL, header, eventos e `base64`/`webhookBase64` | Fonte oficial: DTO usa `base64`; a Evolution pode responder 2xx sem aplicar | Confiar no 2xx (Akros hoje) |
| D4 | Header do segredo: `x-akros-webhook` (já usado). **Nunca** `jwt_key` | O servidor consome `jwt_key` para gerar JWT (fonte oficial) | — |
| D5 | URL do webhook continua `…/evolution-webhook?conta=<uuid>` | A Evolution posta a URL como configurada quando `byEvents=false`; evita refatorar roteamento | Segmento no caminho (TriviAtende): mudança sem ganho para a Evolution |
| D6 | Envio (`sendText`) com a **chave do servidor** (global) | Observado no TriviAtende 2.3.3; o guard oficial aceita global em qualquer rota. O smoke confirma no servidor do Akros | Token da instância: também aceito pelo guard, mas falhou em produção na 2.3.3 |
| D7 | Chave do servidor em Vault escopo `evolution-servidor:<uuid>`; token da instância e segredo do webhook em `evolution:<conta>` | Reaproveita as RPCs; só amplia a regex de escopo | Tabela com segredo: proibido |
| D8 | Nome da instância `akros-<24 hex do id do canal>`; criar é idempotente; `403 already in use` ⇒ recuperar token via `fetchInstances` | Padrão do TriviAtende; retomada sem duplicar | Nome livre no navegador: viola FR-005 |
| D9 | Estado do canal em `contas_canal.estado_conexao`: `sem_credencial`, `configuracao_incompleta`, `aguardando_pareamento`, `conectado_verificado`, `desconectado`, `erro` | FR-008 | Só `ativa`/`credenciais_configuradas` (hoje) |
| D10 | Conectado só se **número pareado == identificador do canal**; número lido de `fetchInstances[].ownerJid` (a 2.3.x não traz owner em `connectionState`); comparação canônica (nono dígito BR) | Padrão do TriviAtende; FR-011 | Aceitar `state=open` |
| D11 | QR devolvido na resposta e nunca persistido; vale ~60 s (TTL do servidor); sem aceite de risco registrado, sem QR | FR-010 | Cache em memória da função (TriviAtende): isolates efêmeros, sem ganho |
| D12 | Remetente `@lid`: telefone só de `remoteJidAlt`/`senderPn`/`remoteJid` (sufixo de dispositivo `:NN` removido, conflito ⇒ nulo); fallback `POST chat/findMessages` filtrando `key.remoteJid==lid` e `fromMe=false`, aceita se **exatamente um** telefone | Padrão do TriviAtende | Adivinhar por nome/foto: proibido |
| D13 | **Sem telefone comprovado ⇒ guardar** em conversa `identificacao='nao_identificada'`, `contato_externo='lid:<dígitos>'`, `cliente_id` nulo, sem resposta, sem mescla | Decisão do usuário (2026-10-27) | Descartar com 200 (TriviAtende) |
| D14 | Vínculo com cliente só se `crm.obter_cliente_unico_por_telefone` achar **exatamente um** | FR-018; hoje o mais antigo vence | Mais antigo (Akros hoje) |
| D15 | **Anexos**: baixar por `POST chat/getBase64FromMediaMessage/{instância}` (`{message:{key:{id}}, convertToMp4:false}`), validar tipo e tamanho (≤15 MB), subir ao bucket privado `comunicacao-anexos` em `<conta>/<origemId>`; falha ⇒ mensagem com `anexo.baixado=false` e motivo | Pedido do usuário; TriviAtende só trata áudio e descarta o resto | Descartar (TriviAtende); guardar só metadados (perde o arquivo) |
| D16 | Agente com anexo de contato identificado ⇒ **mensagem de encaminhamento** (sem IA); não identificado ⇒ sem resposta; figurinha vira aviso em texto e mesmo tratamento | FR-027; documento do cliente não deve virar chute de IA | IA descrevendo imagem: fora de escopo |
| D17 | Forma da mensagem no JSONB: `{id, autor, texto, enviadoEm, lida, tipo, midiaNome?, anexo?:{caminho,mime,tamanhoBytes,baixado,motivo?}}`; `tipo` ∈ `texto|imagem|audio|arquivo|video` (documento ⇒ `arquivo`) | Compatível com `TipoMensagem` existente (E04-S14) | Tabela de mensagens: ADR-0010 manda manter o blob |
| D18 | Não existe ação “reiniciar pareamento por logout” quando `afetada_logout=true` na matriz; a orientação é reiniciar o servidor | Runbook do TriviAtende: logout na 2.3.3 para o recebimento | Oferecer sempre |
| D19 | Eventos de conexão (`CONNECTION_UPDATE`, `QRCODE_UPDATED`) atualizam estado; `MESSAGES_UPDATE` e `SEND_MESSAGE` só reconhecidos (200) | FR-015; o TriviAtende os ignora, aqui o estado vem do evento | Só polling pela tela |
| D20 | Fonte oficial: retries da Evolution — 10 tentativas; **400/401/403/404/422 não são reenviados**. Falha interna ⇒ 5xx (reenvia, recibo deduplica); recusa de autenticação ⇒ 401 | Evita perder evento por status errado | — |
| D21 | O corpo do webhook da Evolution inclui um campo `apikey`; nenhum log de payload | Fonte oficial (`webhook.controller.ts`) | — |

| D22 | Transcrição de áudio (US9, ADR-0022): provedores **Groq** (padrão) e **OpenRouter**, endereços constantes; OpenAI fora (`whisper-1` descontinuado em 2027-02-26, `gpt-transcribe` não provado) | Docs oficiais conferidas em 2026-10-28; o `transcrever-audio` do TriviAtende nunca foi testado ponta a ponta | Portar o do TriviAtende; chave OpenRouter do agente |
| D23 | Ligar a transcrição exige aceite do envio de dados (por provedor) + chave/modelo verificados; trocar provedor/modelo/chave derruba | O áudio sai do Akros; a retenção no provedor não é controlada nem declarada nas páginas consultadas | Ligar só com a chave salva |
| D24 | Transcrever no webhook, antes de registrar; qualquer falha cai no encaminhamento com motivo em código | ADR-0035 do TriviAtende (síncrono, falha explícita); Akros já é síncrono | Fila (E13-S16) |
| D25 | Teto 120 transcrições/h (fail-closed) e transcrição cortada em 4000 caracteres | Controla gasto; o registro recusa texto >4000 e a Evolution reentregaria sem fim | Sem teto; recusar texto longo |

## Riscos abertos (não resolvem no papel)

- **R-A**: versão e comportamento do servidor novo (D1, D6, D10) — fechados só pelo smoke.
- **R-B**: o formato exato de `fetchInstances.ownerJid` e do retorno de `webhook/find` varia por
  versão; o código aceita as duas formas documentadas no TriviAtende (plano ou embrulhado em `webhook`).
- **R-C**: limite de memória da Edge Function ao baixar mídia em base64; por isso o teto de 15 MB.
