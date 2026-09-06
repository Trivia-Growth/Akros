// Teste do próprio gate (invariante 1 de specs/E00-S06-invariantes-padrao-os/, AC-1: "senão ele
// mesmo viola o invariante que verifica"). Fixture em mkdtemp, execFileSync capturando exit code.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const SCRIPT = resolve("scripts/check-gate-coverage.mjs");

function fixture(nomes) {
  const root = mkdtempSync(join(tmpdir(), "gate-coverage-"));
  const scriptsDir = join(root, "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  for (const nome of nomes) writeFileSync(join(scriptsDir, nome), "// fixture\n");
  return root;
}

function run(root) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, root], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, output: stdout };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}`,
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("todo script com teste par passa", () => {
  const result = run(fixture(["foo.mjs", "foo.test.mjs", "bar.mjs", "bar.test.mjs"]));
  assert.equal(result.ok, true, result.output);
});

test("falha listando script sem teste par", () => {
  const result = run(fixture(["foo.mjs", "foo.test.mjs", "bar.mjs"]));
  assert.equal(result.ok, false);
  assert.match(result.output, /bar\.mjs/);
  assert.doesNotMatch(result.output, /- foo\.mjs/);
});

test("não confunde <nome>.test.mjs sozinho com <nome>.mjs precisando de par", () => {
  // arch-rules.test.mjs no repo real não tem arch-rules.mjs — testa dependency-cruiser
  // diretamente. Um .test.mjs órfão (sem .mjs correspondente) não deve ser listado como falha.
  const result = run(fixture(["orfa.test.mjs"]));
  assert.equal(result.ok, false); // zero .mjs "de verdade" == coleção vazia (AC-2), não sucesso
  assert.match(result.output, /nenhum script \.mjs encontrado/);
});

// Guarda AC-2 (E00-S06): scripts/ sem nenhum .mjs é caminho quebrado, não "sem scripts".
test("falha quando scripts/ está vazia", () => {
  const result = run(fixture([]));
  assert.equal(result.ok, false);
  assert.match(result.output, /nenhum script \.mjs encontrado/);
});

test("falha quando a pasta scripts/ não existe", () => {
  const root = mkdtempSync(join(tmpdir(), "gate-coverage-"));
  const result = run(root);
  assert.equal(result.ok, false);
  assert.match(result.output, /pasta scripts\/ não encontrada/);
});
