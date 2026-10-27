-- Remove proteção da versão em uso; reverte garantia de congelamento.
DROP TRIGGER IF EXISTS programa_versao_em_uso ON programas.programas;
DROP FUNCTION IF EXISTS programas.proteger_versao_em_uso();
