#!/usr/bin/env node
// Auditoria da esteira SDD do Padrão OS — valida estrutura, frontmatter, links e specs.
// Uso: node scripts/audit-esteira.mjs [dir]   (default: ".")
// Sai com código 1 se houver violação (gate na CI e na skill /auditar).
// Adaptado do spec-driven (template/scripts/audit-esteira.mjs).

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, resolve, extname } from "node:path";
import { isSpecDir } from "./lib/spec-dirs.mjs";

const ROOT = resolve(process.argv[2] || ".");
const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "coverage",
  ".triviaiox-core", ".triviaiox",
  ".cursor", ".gemini", ".windsurf",
  "graphify-out",
  // Triviaiox agent files use their own format (not SDD frontmatter)
  "TRIVIAIOX", ".codex",
  // Definições de subagente (.claude/agents) e auto-memory (.claude/agent-memory) — geradas/
  // gerenciadas pelo harness, não são docs da esteira SDD e não seguem nenhum dos dois dialetos.
  "agents", "agent-memory",
]);
const NO_FRONTMATTER_OK = new Set([
  "README.md", "CHANGELOG.md", "Definition-of-Done.md", "pull_request_template.md",
  // Índice do sistema de memória — deliberadamente sem frontmatter (ver .claude/memory/MEMORY.md).
  "MEMORY.md",
]);
const rel = (f) => relative(ROOT, f).replace(/\\/g, "/");

// Ignorados por CAMINHO relativo. `IGNORE_DIRS` casa por nome de pasta (`readdirSync` devolve o
// basename), então entrada com barra nunca casa lá — tem que ser checada aqui.
const IGNORE_PATHS = [".claude/skills/_disabled/"];

// Views derivadas geradas por outras ferramentas (não a fonte canônica).
const isGenerated = (f) => {
  const r = rel(f);
  return r === "GEMINI.md" || r === ".github/copilot-instructions.md" ||
    r.startsWith(".github/prompts/") ||
    r === "apps/web/PRODUCT.md" || r === "apps/web/DESIGN.md"; // gerados pela skill impeccable
};

/**
 * Dentro de `.claude/skills/`, só o `SKILL.md` é doc da esteira. O resto (`reference/`,
 * `scripts/`, exemplos) é material interno da skill e segue o formato de quem a escreveu.
 * Vale para as skills do projeto — todas têm só `SKILL.md` — e para skills de terceiro
 * vendorizadas no repo (ex.: `impeccable`), que precisam ser commitadas para que qualquer
 * pessoa ou agente que clone o projeto herde o mesmo padrão de desenvolvimento.
 */
const isSkillInterno = (f) => {
  const r = rel(f);
  return r.startsWith(".claude/skills/") && !r.endsWith("/SKILL.md");
};

const isForaDaEsteira = (f) =>
  isGenerated(f) || isSkillInterno(f) || IGNORE_PATHS.some((p) => rel(f).startsWith(p));
const errors = [];
const err = (file, msg) => errors.push(`${relative(ROOT, file) || file}: ${msg}`);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name) || name.startsWith(".tmp")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (extname(full) === ".md") out.push(full);
  }
  return out;
}

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const block = text.slice(3, end).trim();
  const keys = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:/);
    if (m) keys[m[1]] = line.slice(m[0].length).trim();
  }
  return keys;
}

// Skills e templates de skill/subagente usam outro dialeto (sem alwaysApply).
const isSkillDialect = (f) =>
  f.replace(/\\/g, "/").includes("/.claude/skills/") ||
  /(?:^|\/)(skill|subagent)\.template\.md$/.test(f.replace(/\\/g, "/"));

// Sistema de memória (auto memory) usa `metadata: { type: ... }` em vez de `alwaysApply`.
const isMemoryDialect = (f) => f.replace(/\\/g, "/").includes("/.claude/memory/");

const files = walk(ROOT).filter((f) => !isForaDaEsteira(f));

// 1) Frontmatter + dialeto
for (const f of files) {
  if (NO_FRONTMATTER_OK.has(f.split(/[\\/]/).pop())) continue;
  const text = readFileSync(f, "utf8");
  const fm = parseFrontmatter(text);
  if (!fm) { err(f, "sem frontmatter"); continue; }
  if (!fm.name) err(f, "frontmatter sem `name`");
  if (!fm.description) err(f, "frontmatter sem `description`");
  if (isSkillDialect(f)) {
    if ("alwaysApply" in fm) err(f, "dialeto skill não deve ter `alwaysApply`");
  } else if (isMemoryDialect(f)) {
    if (!("metadata" in fm)) err(f, "memória sem `metadata`");
  } else {
    if (!("alwaysApply" in fm)) err(f, "doc sem `alwaysApply`");
    else if (!/^(true|false)$/.test(fm.alwaysApply)) err(f, `alwaysApply inválido: ${fm.alwaysApply}`);
  }
}

// 2) Links relativos quebrados
const linkRe = /\]\(([^)]+)\)/g;
for (const f of files) {
  const text = readFileSync(f, "utf8");
  let m;
  while ((m = linkRe.exec(text))) {
    let target = m[1].trim();
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    if (/[<>]|XXXX|NNNN|\s/.test(target)) continue; // placeholders
    target = target.split("#")[0];
    if (!target) continue;
    if (!existsSync(resolve(dirname(f), target))) err(f, `link quebrado → ${target}`);
  }
}

// 2b) Caminho `docs/**.md` citado em PROSA (fora de link markdown) que não existe.
// Por que existe: `docs/SECURITY_DEBT.md` era citado por 10 documentos — CLAUDE.md, DoD,
// ANTI-PADROES, 2 ADRs, 2 skills — e nunca foi criado. Como as menções eram texto e crase, e não
// `[link](caminho)`, a checagem (2) não via nada. Documento que promete um arquivo e não entrega
// é fonte de verdade apodrecendo (auditoria de 2026-08-30).
const bareDocRe = /\bdocs\/[A-Za-z0-9_\-/.]*\.md\b/g;
const isPlaceholder = (t) => /NNNN|XXXX|AAAA|YYYY|MM-|-MM|[<>*]|\.\.\./.test(t);
for (const f of files) {
  const text = readFileSync(f, "utf8");
  const vistos = new Set();
  let m;
  while ((m = bareDocRe.exec(text))) {
    const target = m[0];
    if (isPlaceholder(target) || vistos.has(target)) continue;
    vistos.add(target);
    if (!existsSync(resolve(ROOT, target))) err(f, `cita caminho inexistente → ${target}`);
  }
}

// 2c) `pnpm run <script>` citado em documentação que não existe no package.json.
// Por que existe: o README — porta de entrada do projeto e do padrão — mandava rodar
// `pnpm run prepare-hooks` e `pnpm run eval:spec-fidelity`; os scripts reais são `prepare` e
// `eval:spec`. Ninguém percebeu porque o README é o ÚNICO documento sem cobertura de gate
// (está em NO_FRONTMATTER_OK). Documentação de onboarding que não roda é pior que ausente:
// quem chega assume que errou (auditoria de 2026-08-31).
//
// Só `pnpm run <nome>` explícito é checado. `pnpm <nome>` sem `run` casaria prosa em português
// ("monorepo pnpm já existe" vira `pnpm já`) — falso positivo não pode existir num gate.
const scriptsDeclarados = new Set();
const appsDir = join(ROOT, "apps");
const pkgsDeApps = existsSync(appsDir)
  ? readdirSync(appsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join("apps", d.name, "package.json"))
  : [];
for (const pkg of ["package.json", ...pkgsDeApps]) {
  const full = join(ROOT, pkg);
  if (!existsSync(full)) continue;
  try {
    for (const nome of Object.keys(JSON.parse(readFileSync(full, "utf8")).scripts ?? {}))
      scriptsDeclarados.add(nome);
  } catch {
    err(full, "package.json inválido");
  }
}
if (scriptsDeclarados.size) {
  const cmdRe = /pnpm run ([a-z][a-z0-9:._-]*)/g;
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const vistos = new Set();
    let m;
    while ((m = cmdRe.exec(text))) {
      const nome = m[1];
      if (vistos.has(nome)) continue;
      vistos.add(nome);
      if (!scriptsDeclarados.has(nome)) err(f, `cita script inexistente → pnpm run ${nome}`);
    }
  }
}

// 3) Toda pasta specs/NNNN-* precisa de spec.md
const specsDir = join(ROOT, "specs");
if (existsSync(specsDir)) {
  let vistas = 0;
  for (const name of readdirSync(specsDir)) {
    if (!isSpecDir(name)) continue;
    vistas++;
    const specPath = join(specsDir, name, "spec.md");
    if (!existsSync(specPath)) {
      err(join(specsDir, name), "feature sem `spec.md`");
      continue;
    }
    // ADR-0011: o tier decide quais artefatos a feature precisa ter. Sem ele declarado, nenhum
    // gate consegue exigir a coisa certa — era a lacuna que sustentava a regra não cumprida.
    const fmSpec = parseFrontmatter(readFileSync(specPath, "utf8"));
    const tier = (fmSpec?.tier ?? "").toLowerCase().replace(/\*/g, "").trim();
    if (!tier) err(specPath, "spec sem `tier` no frontmatter (trivial | pequeno | arquitetural)");
    else if (!["trivial", "pequeno", "arquitetural"].includes(tier))
      err(specPath, `tier inválido: ${tier} (use trivial | pequeno | arquitetural)`);
  }
  // Mesma armadilha do eval de fidelidade: com o filtro de nome errado esta checagem varria uma
  // lista vazia e reportava OK. Zero pastas de feature em `specs/` é sinal de gate quebrado.
  if (vistas === 0)
    err(specsDir, "nenhuma pasta de feature reconhecida (`E01-S01-*` / `0001-*`) — filtro quebrado?");
}

// Relatório
if (errors.length) {
  console.error(`\n✗ Auditoria da esteira: ${errors.length} problema(s)\n`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error("");
  process.exit(1);
} else {
  console.log(`✓ Auditoria da esteira: ${files.length} docs OK (frontmatter, links, specs).`);
}
