// Teste do próprio gate (invariante 1 de specs/E00-S06-invariantes-padrao-os/, forma de
// scripts/check-edge-functions.test.mjs): fixture em mkdtemp, execFileSync capturando exit code,
// um test() por modo de falha.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const SCRIPT = resolve("scripts/validate-mermaid.mjs");

function fixture(conteudo) {
  const root = mkdtempSync(join(tmpdir(), "mermaid-gate-"));
  writeFileSync(join(root, "doc.md"), conteudo);
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

test("aceita bloco mermaid válido", () => {
  const r = run(fixture("Diagrama:\n\n```mermaid\nflowchart LR\n  A --> B\n```\n"));
  assert.equal(r.ok, true);
});

test("falha para bloco mermaid vazio", () => {
  const r = run(fixture("```mermaid\n\n```\n"));
  assert.equal(r.ok, false);
  assert.match(r.output, /bloco mermaid vazio/);
});

// AC-2 (E00-S06): zero blocos varridos é falha do gate (diretório/caminho quebrado), nunca sucesso
// varrendo nada — a mesma classe de bug do filtro de specs da auditoria de 2026-08-30.
test("falha quando não há nenhum bloco mermaid (coleção vazia)", () => {
  const r = run(fixture("Documento sem nenhum diagrama.\n"));
  assert.equal(r.ok, false);
  assert.match(r.output, /nenhum bloco ```mermaid encontrado/);
});
