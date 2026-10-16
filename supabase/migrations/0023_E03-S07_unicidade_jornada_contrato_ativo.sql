-- Description: Fecha uma corrida de concorrência encontrada na revisão adversarial de T031/T032
--              (caso-comandos): `jornada.jornadas` não tinha UNIQUE em `cliente_id` e a
--              checagem de existência em `crm.preparar_caso` (SELECT sem lock, porque não havia
--              linha prévia para travar com FOR UPDATE) deixava duas chamadas concorrentes para
--              o MESMO cliente novo passarem as duas pelo ramo "não existe" sob READ COMMITTED,
--              duplicando fases/etapas. Mesma classe de lacuna em `crm.contratos` para o
--              primeiro contrato de um cliente novo (`crm_contratos_cliente_ativo_idx`, 0017, é
--              índice parcial, não UNIQUE).
--
--              `0001`-`0022` são imutáveis por convenção desta feature — esta migration só
--              ADICIONA constraint/índice novos, não toca a definição de `jornada.jornadas`
--              (0003) nem de `crm.contratos` (0017). O tratamento do `unique_violation`
--              resultante vive em `0022` (migration ainda não aplicada fora da verificação local
--              desta task — editá-la é seguro, ao contrário de `0001`-`0021`).
-- Story: E03-S07
-- Created: 2026-10-16

-- Rollback: DROP INDEX IF EXISTS crm.crm_contratos_um_ativo_por_cliente;
--           DROP INDEX IF EXISTS jornada.jornadas_cliente_unico_idx;

-- jornada.jornadas: uma jornada por cliente no piloto (ver design-tecnico.md data-model) —
-- fecha a corrida de crm.preparar_caso criando a mesma jornada duas vezes. `CREATE UNIQUE
-- INDEX` (não `ADD CONSTRAINT ... UNIQUE`) de propósito — squawk sinaliza a forma `ADD
-- CONSTRAINT` como lock ACCESS EXCLUSIVE evitável (disallowed-unique-constraint); o índice
-- único avulso dá a mesma garantia (unique_violation/23505 no INSERT duplicado) com o mesmo
-- criterio de lock que `CREATE UNIQUE INDEX` já usado sem ressalva em 0013/0016 deste
-- repositório. Tabela pequena nesta fase (protótipo, sem dado de produção) — sem CONCURRENTLY.
CREATE UNIQUE INDEX jornadas_cliente_unico_idx ON jornada.jornadas (cliente_id);

-- crm.contratos: no máximo um contrato ativo por cliente a qualquer momento — fecha a corrida
-- de crm.registrar_contrato quando o cliente ainda não tem nenhum contrato (sem linha prévia
-- para a SELECT ... FOR UPDATE travar, as duas chamadas concorrentes inseririam "o" contrato
-- ativo sem este índice).
CREATE UNIQUE INDEX crm_contratos_um_ativo_por_cliente ON crm.contratos (cliente_id) WHERE ativo;
