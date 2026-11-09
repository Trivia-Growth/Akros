-- Description: E08-S05 — chat do portal real: cliente ou admin envia mensagem, gravada em
--              `comunicacao.eventos` (canal 'chat_portal', append-only — fecha em 0048).
--              `comunicacao.enviar_mensagem_portal` é chamada pela Edge Function
--              `comunicacao-chat-portal` (autorização de participação verificada lá, mesmo
--              padrão de `autorizacao-caso.ts`); a RPC só grava, mesmo template SECURITY DEFINER
--              do resto do repositório.
--
--              SPEC_DEVIATION (tasks — canal privado): a spec pede "mais um canal reservado para
--              assunto particular com uma pessoa específica (exceção à visibilidade de equipe)".
--              Esta migration NÃO cria esse canal — fica para iteração seguinte (mudar o CHECK de
--              `canal`/adicionar `destinatario_admin_id` e a policy de exceção é decisão de
--              produto que não coube nesta sessão: quem define "a pessoa específica"? o case
--              manager do caso, ou escolha livre do cliente? registrado em
--              `docs/SECURITY_DEBT.md`, não implementado às pressas sem essa resposta.
-- Story: E08-S05
-- Created: 2026-11-06

-- Rollback:
--   DROP FUNCTION IF EXISTS comunicacao.enviar_mensagem_portal(uuid, text, text, text, uuid);

CREATE OR REPLACE FUNCTION comunicacao.enviar_mensagem_portal(
  p_cliente_id uuid,
  p_autor_tipo text,
  p_autor_nome text,
  p_conteudo text,
  p_autor_id uuid
)
RETURNS comunicacao.eventos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = comunicacao, pg_temp
AS $$
DECLARE
  v_evento comunicacao.eventos%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'envio de mensagem negado' USING ERRCODE = '42501';
  END IF;
  IF p_autor_id IS NULL THEN
    RAISE EXCEPTION 'autor obrigatório' USING ERRCODE = '22023';
  END IF;
  IF p_autor_tipo NOT IN ('cliente', 'akros') THEN
    RAISE EXCEPTION 'autor_tipo inválido' USING ERRCODE = '22023';
  END IF;
  IF btrim(COALESCE(p_conteudo, '')) = '' THEN
    RAISE EXCEPTION 'conteúdo obrigatório' USING ERRCODE = '22023';
  END IF;

  INSERT INTO comunicacao.eventos (
    cliente_id, canal, direcao, autor, conteudo, ocorrido_em
  ) VALUES (
    p_cliente_id,
    'chat_portal',
    CASE WHEN p_autor_tipo = 'cliente' THEN 'entrada' ELSE 'saida' END,
    p_autor_nome,
    p_conteudo,
    now()
  )
  RETURNING * INTO v_evento;

  RETURN v_evento;
END;
$$;

REVOKE ALL ON FUNCTION comunicacao.enviar_mensagem_portal(uuid, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION comunicacao.enviar_mensagem_portal(uuid, text, text, text, uuid) TO service_role;
