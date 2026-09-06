// Teste do próprio gate (invariante 1 de specs/E00-S06-invariantes-padrao-os/): cwd isolado em
// mkdtemp (sem node_modules/.bin/lefthook) + PATH vazio, spawnSync capturando exit code. Roda
// fora do repositório real de propósito — `lefthook install` de verdade mexeria em .git/hooks.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const SCRIPT = resolve("scripts/prepare-hooks.mjs");

function run(env, cwd) {
  return spawnSync(process.execPath, [SCRIPT], { encoding: "utf8", env, cwd });
}

test("em CI, pula instalação e sai 0 sem tocar em lefthook", () => {
  const cwd = mkdtempSync(join(tmpdir(), "prepare-hooks-"));
  try {
    const result = run({ ...process.env, CI: "true", PATH: "" }, cwd);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /pulando instalação/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("fora de CI, sem bin local nem `lefthook` no PATH, falha (saída não-zero)", () => {
  const cwd = mkdtempSync(join(tmpdir(), "prepare-hooks-"));
  try {
    const result = run(
      { ...process.env, CI: undefined, NETLIFY: undefined, GITHUB_ACTIONS: undefined, PATH: "" },
      cwd,
    );
    assert.notEqual(result.status, 0);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
