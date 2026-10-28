# Contrato: `evolution-webhook` (público, autenticado)

`POST /functions/v1/evolution-webhook?conta=<uuid>` com `x-akros-webhook: <segredo da conta>`.

Ordem: método → rate limit → `conta` UUID → conta/credenciais → **segredo (tempo constante)** → corpo
(≤64 KiB, JSON) → evento. Resposta mínima `{"ok":bool}`; nunca descreve o motivo.

| Evento (`event`, normalizado `MAIÚSCULA_COM_UNDERSCORE`) | Efeito | Resposta |
|---|---|---|
| `CONNECTION_UPDATE` (`data.state` = `open`/`close`/`connecting`) | atualiza `estado_conexao` (open exige conferir número no próximo `consultar_estado`; close ⇒ `desconectado`) | 200 |
| `QRCODE_UPDATED`, `MESSAGES_UPDATE`, `SEND_MESSAGE` | reconhecido, sem efeito | 200 |
| `MESSAGES_UPSERT` texto (`conversation`/`extendedTextMessage`) | registra, deduplica, agente decide | 200 |
| `MESSAGES_UPSERT` mídia (`image/document/audio/video`) | baixa, guarda, registra com `anexo`; agente envia encaminhamento | 200 |
| `MESSAGES_UPSERT` **áudio** com transcrição ligada | baixa, guarda, **transcreve** (≤20 s, teto 120/h); texto vira a mensagem (`anexo.transcricao.estado='concluida'`) e o agente atende como texto; **falha** ⇒ `anexo.transcricao={estado:'falhou',motivo}` + encaminhamento | 200 |
| `MESSAGES_UPSERT` figurinha | registra aviso em texto; agente envia encaminhamento | 200 |
| `MESSAGES_UPSERT` grupo, `fromMe`, reação, protocolo (apagada) | ignorado | 200 |
| `MESSAGES_UPSERT` sem telefone comprovado | registra em conversa `nao_identificada`; sem resposta | 200 |
| segredo ausente/errado | nada lido | 401 |
| conta inexistente/UUID inválido | — | 404 |
| falha interna antes de gravar | Evolution reenvia (recibo deduplica) | 500 |
| corpo >64 KiB / não JSON | — | 413 / 400 |
