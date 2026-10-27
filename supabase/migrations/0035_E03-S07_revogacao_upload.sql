-- Description: Revalida acesso do usuário ao objeto reservado no Storage.
-- Story: E03-S07
-- Rollback: aplicar supabase/rollback/0035_E03-S07_revogacao_upload.sql; reverte segurança.

CREATE OR REPLACE FUNCTION arquivos.reserva_ativa_para_objeto(p_nome_objeto text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = arquivos, crm, documentos, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM arquivos.reservas_envio r
    JOIN arquivos.versoes v ON v.id = r.versao_id
    WHERE r.objeto_permitido = p_nome_objeto
      AND r.expira_em > now()
      AND r.criada_por = auth.uid()
      AND v.estado_recebimento = 'reservada'
      AND (
        crm.e_admin()
        OR (
          (
            EXISTS (SELECT 1 FROM crm.participantes p WHERE p.cliente_id = v.cliente_id AND p.auth_user_id = auth.uid() AND p.estado = 'ativo')
            OR (
              EXISTS (SELECT 1 FROM crm.clientes c WHERE c.id = v.cliente_id AND c.auth_user_id = auth.uid() AND c.deleted_at IS NULL)
              AND NOT EXISTS (SELECT 1 FROM crm.participantes p WHERE p.cliente_id = v.cliente_id AND p.auth_user_id = auth.uid())
            )
          )
          AND (
            v.documento_id IS NULL OR EXISTS (
              SELECT 1 FROM documentos.documentos d WHERE d.id = v.documento_id
                AND (d.fase_id IS NULL OR documentos.fase_liberada_para_portal(d.fase_id))
                AND (NOT d.restrito_ao_papel OR (d.papel_dirigido IS NOT NULL AND crm.tenho_papel(v.cliente_id, d.papel_dirigido)))
                AND (d.envio_conjunto OR (d.papel_dirigido IS NULL AND NOT d.restrito_ao_papel)
                  OR (d.papel_dirigido IS NOT NULL AND crm.tenho_papel(v.cliente_id, d.papel_dirigido)))
            )
          )
        )
      )
  );
$$;
