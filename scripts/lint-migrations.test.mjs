// Teste do próprio gate (invariante 1 de specs/E00-S06-invariantes-padrao-os/).
// Cobre as convenções da casa — DROP com reverso, POLICY com GRANT, RLS FORCE, sequência sem
// colisão. NÃO cobre o Squawk: ferramenta de terceiro com suíte própria, desligada aqui pelo
// seam `LINT_MIGRATIONS_SKIP_SQUAWK`.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const SCRIPT = resolve("scripts/lint-migrations.mjs");

/** @param arquivos mapa nome-do-arquivo → SQL */
function fixture(arquivos) {
  const root = mkdtempSync(join(tmpdir(), "lint-migrations-"));
  const dir = join(root, "supabase", "migrations");
  mkdirSync(dir, { recursive: true });
  for (const [nome, sql] of Object.entries(arquivos)) writeFileSync(join(dir, nome), sql);
  return root;
}

function run(root) {
  try {
    return {
      ok: true,
      output: execFileSync(process.execPath, [SCRIPT, root], {
        encoding: "utf8",
        env: { ...process.env, LINT_MIGRATIONS_SKIP_SQUAWK: "1" },
      }),
    };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}`,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const TABELA_OK = `
CREATE TABLE crm.clientes (id uuid PRIMARY KEY);
ALTER TABLE crm.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.clientes FORCE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA crm TO portal;
GRANT SELECT ON crm.clientes TO portal;
CREATE POLICY "cliente ve o proprio" ON crm.clientes FOR SELECT USING (true);
`;

test("migration correta passa", () => {
  const r = run(fixture({ "0001_E13-S01_ok.sql": TABELA_OK }));
  assert.equal(r.ok, true);
  assert.match(r.output, /RLS FORCE em toda tabela/);
});

test("falha para tabela sem FORCE ROW LEVEL SECURITY", () => {
  const sql = TABELA_OK.replace("ALTER TABLE crm.clientes FORCE ROW LEVEL SECURITY;\n", "");
  const r = run(fixture({ "0001_E13-S01_sem_force.sql": sql }));
  assert.equal(r.ok, false);
  assert.match(r.output, /sem FORCE ROW LEVEL SECURITY/);
});

test("falha para tabela sem ENABLE ROW LEVEL SECURITY", () => {
  const sql = TABELA_OK.replace("ALTER TABLE crm.clientes ENABLE ROW LEVEL SECURITY;\n", "");
  const r = run(fixture({ "0001_E13-S01_sem_enable.sql": sql }));
  assert.equal(r.ok, false);
  assert.match(r.output, /sem ENABLE ROW LEVEL SECURITY/);
});

test("exceção documentada de RLS FORCE é aceita", () => {
  const sql = `-- rls-force: excecao — tabela de catálogo estático, sem dado de cliente\n${TABELA_OK.replace(
    "ALTER TABLE crm.clientes FORCE ROW LEVEL SECURITY;\n",
    "",
  )}`;
  const r = run(fixture({ "0001_E13-S01_excecao.sql": sql }));
  assert.equal(r.ok, true);
});

test("falha para CREATE POLICY sem GRANT na tabela", () => {
  const sql = TABELA_OK.replace("GRANT SELECT ON crm.clientes TO portal;\n", "");
  const r = run(fixture({ "0001_E13-S01_sem_grant.sql": sql }));
  assert.equal(r.ok, false);
  assert.match(r.output, /sem GRANT correspondente/);
});

test("falha para DROP destrutivo sem '-- Reverso:'", () => {
  const r = run(fixture({ "0001_E13-S01_drop.sql": "DROP TABLE crm.antiga;\n" }));
  assert.equal(r.ok, false);
  assert.match(r.output, /DROP destrutivo sem/);
});

test("falha para duas migrations com o mesmo prefixo numérico", () => {
  const r = run(
    fixture({ "0001_E13-S01_a.sql": TABELA_OK, "0001_E13-S02_b.sql": "SELECT 1;\n" }),
  );
  assert.equal(r.ok, false);
  assert.match(r.output, /usado em 2 migrations/);
});
