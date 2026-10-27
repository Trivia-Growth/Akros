-- Reverte validação de familiar no mesmo caso.
DROP TRIGGER IF EXISTS documento_familiar_do_caso ON documentos.documentos;
DROP TRIGGER IF EXISTS participante_familiar_do_caso ON crm.participantes;
DROP FUNCTION IF EXISTS crm.validar_familiar_documento();
DROP FUNCTION IF EXISTS crm.validar_familiar_participante();
DROP FUNCTION IF EXISTS crm.familiar_pertence_ao_caso(uuid, text);
