# Contrato: Edge Function `canal-evolution` (admin)

`POST /functions/v1/canal-evolution` — corpo JSON `{ "acao": "...", ... }` (Zod `.strict()`).
Cabeçalhos: `Authorization: Bearer <JWT admin>`, `X-Akros-Csrf: 1`. Rate limit `canal-evolution`
(600/h, fail-closed). Resposta nunca contém chave, token, segredo, QR persistido ou corpo da Evolution.
Erros: `{ "erro": "<mensagem curta PT-BR>", "codigo": "<slug>", "reqId": "..." }`.

Capacidades obrigatórias para aceitar instâncias: `instanceCreate`, `qr`, `connectionState`,
`webhookHeaders`, `webhookEvents`. `sendText` (envio) é provado por `enviar_teste` e condiciona
`definir_ativa(true)`.

| acao | entrada | saída (200) | códigos de erro |
|---|---|---|---|
| `salvar_servidor` | `{urlBase, apiKey}` | `{estado: compativel\|incompativel, versao, motivo?, indicio, afetadaLogout}`; **endereço diferente do anterior reinicia os canais** | `url_recusada` 400, `servidor_indisponivel` 502, `chave_recusada` 502 |
| `registrar_compatibilidade` | `{versao, capacidades[], afetadaLogout, evidencia}` | `{versao, compativel}` | `requisicao_invalida` 400 |
| `criar_canal` | `{nomeExibicao, numero}` | `{contaId, estado: sem_credencial}` | `numero_invalido` 400, `numero_ja_cadastrado` 409 |
| `criar_instancia` | `{contaId}` | `{estado: configuracao_incompleta, jaExistia}` | `servidor_nao_configurado` 409, `servidor_indisponivel` 502, `canal_invalido` 422 |
| `instalar_webhook` | `{contaId}` | `{estado: aguardando_pareamento}` | `instancia_nao_criada` 409, `webhook_nao_confirmado` 502, `conflito_configuracao` 409 |
| `aceitar_risco` | `{contaId}` | `{aceito: true}` | `canal_invalido` 422 |
| `gerar_qr` | `{contaId}` | `{qrBase64, expiraEm}` | `risco_nao_aceito` 409, `instancia_nao_aguarda_pareamento` 409 |
| `consultar_estado` | `{contaId}` | `{estado, numeroDivergente?: true, semNumero?: true}` | `instancia_nao_criada` 409, `servidor_indisponivel` 502 |
| `enviar_teste` | `{contaId, numero}` | `{enviado: true}` (registra `sendText` na versão) | `canal_nao_conectado` 409, `numero_proprio` 400, `envio_falhou` 502 |
| `definir_ativa` | `{contaId, ativa}` | `{ativa}` | `canal_nao_conectado` 409, `envio_nao_provado` 409 |
| `vincular_agente` | `{contaId, agenteId}` | `{vinculado: true}` | `agente_inexistente` 404 |
| `salvar_transcricao` | `{provedor: groq\|openrouter, modelo, idioma: "pt"\|"en"\|…\|null, apiKey?, aceiteEnvioDados}` (`apiKey` ausente mantém a guardada, só no mesmo provedor) | `{provedor, modelo, idioma, indicio, ativa, verificada}`; mudar provedor/modelo/chave zera `verificada` e desliga | `chave_obrigatoria` 400, `aceite_obrigatorio` 400 |
| `testar_transcricao` | `{}` | `{verificada: true}` (chave e modelo conferidos na lista do provedor; **não** transcreve) | `transcricao_nao_configurada` 409, `chave_ausente` 409, `chave_recusada` 502 e `modelo_indisponivel` 502 (desligam), `limite_do_provedor`/`tempo_esgotado`/`provedor_indisponivel`/`resposta_invalida` 502, `conflito_configuracao` 409 |
| `definir_transcricao_ativa` | `{ativa}` | `{ativa}` | `transcricao_nao_configurada` 409, `transcricao_nao_verificada` 409 |

A transcrição de áudio (ADR-0022) usa a mesma porta: a chave do provedor vai ao Vault
(`transcricao:<id>`) e nunca volta; o aceite vale para um provedor; ligar exige aceite **e** teste.

Garantias: só `app_metadata.role='admin'` (verificado no Auth, nunca no corpo); `contaId` precisa ser
conta `evolution` não apagada; nome da instância derivado no servidor; auditoria por ação
(tabela `audit.*` via trigger nas tabelas alteradas) sem segredo.
