// Teste do próprio gate (invariante 1 de specs/E00-S06-invariantes-padrao-os/): fixture em
// mkdtemp, execFileSync capturando exit code. Usa o modo --flag (não interativo) — ver comentário
// em scripts/nova-story.mjs sobre por que rl.question() encadeado não é testável via stdin pipe.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const SCRIPT = resolve("scripts/nova-story.mjs");

function fixture({ roadmap } = {}) {
  const root = mkdtempSync(join(tmpdir(), "nova-story-"));
  mkdirSync(join(root, "specs"), { recursive: true });
  mkdirSync(join(root, "docs", "epics"), { recursive: true });
  writeFileSync(
    join(root, "docs", "epics", "ROADMAP.md"),
    roadmap ??
      "# ROADMAP\n\n## E20 — Épico de teste\n\n" +
        "| Story | Título | Descrição | Owner | Status | Spec | Concluída | Commit |\n" +
        "|-------|--------|-----------|-------|--------|------|-----------|--------|\n" +
        "| E20-S01 | Já existe | Story preexistente | @alguem | 🟩 | ✅ | 2026-01-01 | `abc123` |\n" +
        "\n## E21 — Outro épico\n\n| Story |\n|-------|\n",
  );
  return root;
}

// Não apaga `root` — os testes precisam inspecionar arquivos criados depois. Cada test() cuida
// da própria limpeza (try/finally).
function run(root, { epico, story, descricao, owner = "Lucas", tier = "pequeno" }) {
  const result = spawnSync(
    process.execPath,
    [
      SCRIPT,
      "--root",
      root,
      "--epico",
      epico,
      "--story",
      story,
      "--descricao",
      descricao,
      "--owner",
      owner,
      "--tier",
      tier,
    ],
    { encoding: "utf8" },
  );
  return { ok: result.status === 0, output: `${result.stdout}${result.stderr}` };
}

test("falha quando a pasta da story já existe", () => {
  const root = fixture();
  try {
    mkdirSync(join(root, "specs", "E20-S02-duplicada"), { recursive: true });
    const result = run(root, { epico: "20", story: "02", descricao: "duplicada" });
    assert.equal(result.ok, false);
    assert.match(result.output, /já existe/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("cria spec.md, tasks.md, insere linha no épico existente e grava .current-story", () => {
  const root = fixture();
  try {
    const result = run(root, {
      epico: "20",
      story: "02",
      descricao: "nova feature de teste",
      owner: "Lucas",
      tier: "arquitetural",
    });
    assert.equal(result.ok, true, result.output);

    const specDir = join(root, "specs", "E20-S02-nova-feature-de-teste");
    assert.equal(existsSync(join(specDir, "spec.md")), true);
    assert.equal(existsSync(join(specDir, "tasks.md")), true);
    assert.match(readFileSync(join(specDir, "spec.md"), "utf8"), /E20-S02/);

    const roadmap = readFileSync(join(root, "docs", "epics", "ROADMAP.md"), "utf8");
    assert.match(
      roadmap,
      /\| E20-S02 \| nova feature de teste \| nova feature de teste \| Lucas \|/,
    );
    // linha nova entra dentro da tabela do E20, não depois da linha em branco que já separa E21
    assert.ok(roadmap.indexOf("E20-S02") < roadmap.indexOf("## E21"));

    assert.equal(readFileSync(join(root, ".current-story"), "utf8"), "E20-S02");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("sem seção do épico no ROADMAP: avisa e ainda cria os arquivos de spec (não falha silenciosamente)", () => {
  const root = fixture({ roadmap: "# ROADMAP\n\nsem nenhum épico aqui\n" });
  try {
    const result = run(root, { epico: "99", story: "01", descricao: "story orfa" });
    assert.equal(result.ok, true, result.output);
    assert.match(result.output, /não encontrada no ROADMAP/);
    assert.equal(existsSync(join(root, "specs", "E99-S01-story-orfa", "spec.md")), true);
    // ROADMAP não foi corrompido: conteúdo original preservado ao pé da letra
    assert.equal(
      readFileSync(join(root, "docs", "epics", "ROADMAP.md"), "utf8"),
      "# ROADMAP\n\nsem nenhum épico aqui\n",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
