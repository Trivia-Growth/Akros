// Teste do próprio script (invariante 1 de specs/E00-S06-invariantes-padrao-os/). Nota: este é um
// hook PreToolUse do Claude Code, documentado como "Exit 0 — nunca bloqueia, só lembra" — não há
// entrada que o faça sair não-zero por desenho (avisar sem travar a ferramenta). A cobertura aqui
// prova o conteúdo do aviso em stderr por cenário, não um caso de saída não-zero (não existe um).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const SCRIPT = resolve("scripts/check-story.mjs");

function run(root, toolInput) {
  const result = spawnSync(process.execPath, [SCRIPT, root], {
    input: JSON.stringify(toolInput),
    encoding: "utf8",
  });
  return { status: result.status, stderr: result.stderr };
}

function fixture() {
  return mkdtempSync(join(tmpdir(), "check-story-"));
}

test("arquivo em padrão ignorado (specs/) sai 0 sem aviso", () => {
  const root = fixture();
  try {
    const r = run(root, { file_path: "specs/E01-S01-foo/spec.md" });
    assert.equal(r.status, 0);
    assert.equal(r.stderr, "");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("arquivo de código sem story ativa: sai 0 mas avisa no stderr", () => {
  const root = fixture();
  try {
    const r = run(root, { file_path: "apps/web/src/features/jornada/Foo.tsx" });
    assert.equal(r.status, 0);
    assert.match(r.stderr, /NENHUMA STORY ATIVA/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("arquivo de código com story ativa registrada: sai 0 e confirma a story", () => {
  const root = fixture();
  try {
    writeFileSync(join(root, ".current-story"), "E13-S12", "utf8");
    const r = run(root, { file_path: "apps/web/src/features/jornada/Foo.tsx" });
    assert.equal(r.status, 0);
    assert.match(r.stderr, /Story ativa: E13-S12/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("stdin malformado não derruba o hook (fail-safe, ainda sai 0)", () => {
  const root = fixture();
  try {
    const result = spawnSync(process.execPath, [SCRIPT, root], {
      input: "{ isso não é json",
      encoding: "utf8",
    });
    assert.equal(result.status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
