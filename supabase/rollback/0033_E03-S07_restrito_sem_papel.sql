-- Restaura policies anteriores; reverte correção de segurança.
ALTER POLICY "participante_ve_documento_do_caso_no_seu_papel" ON documentos.documentos USING (
  cliente_id IN (SELECT crm.meus_casos())
  AND (NOT restrito_ao_papel OR papel_dirigido IS NULL OR crm.tenho_papel(cliente_id, papel_dirigido))
  AND (fase_id IS NULL OR documentos.fase_liberada_para_portal(fase_id))
);

ALTER POLICY "participante_ve_decisao_do_documento_no_seu_papel" ON documentos.decisoes_revisao USING (
  EXISTS (
    SELECT 1 FROM documentos.documentos d
    WHERE d.id = decisoes_revisao.documento_id
      AND d.cliente_id IN (SELECT crm.meus_casos())
      AND (NOT d.restrito_ao_papel OR d.papel_dirigido IS NULL OR crm.tenho_papel(d.cliente_id, d.papel_dirigido))
      AND (d.fase_id IS NULL OR documentos.fase_liberada_para_portal(d.fase_id))
  )
);

ALTER POLICY "participante_ve_versao_do_caso_no_seu_papel" ON arquivos.versoes USING (
  EXISTS (
    SELECT 1 FROM documentos.documentos d
    WHERE d.id = versoes.documento_id
      AND d.cliente_id IN (SELECT crm.meus_casos())
      AND (NOT d.restrito_ao_papel OR d.papel_dirigido IS NULL OR crm.tenho_papel(d.cliente_id, d.papel_dirigido))
      AND (d.fase_id IS NULL OR documentos.fase_liberada_para_portal(d.fase_id))
  )
  OR EXISTS (
    SELECT 1 FROM pagamentos.pagamentos p
    WHERE p.id = versoes.pagamento_id AND p.cliente_id IN (SELECT crm.meus_casos())
  )
);
