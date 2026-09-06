#!/usr/bin/env node
/**
 * pnpm nova-story
 * Registra uma nova story no ROADMAP.md, cria a pasta specs/E0N-S0N-<nome>/
 * com spec.md e tasks.md a partir dos templates, e grava .current-story.
 *
 * Uso: pnpm nova-story                       (interativo)
 *      node scripts/nova-story.mjs --epico 01 --story 03 --descricao "..." --owner Lucas [--tier pequeno]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

// Flags nomeadas (--epico, --story, --descricao, --owner, --tier, --root) existem só pra
// automação e teste isolado (scripts/nova-story.test.mjs) — sem elas o script pergunta
// interativamente, uso normal de `pnpm nova-story`. Root cai no repositório real por padrão.
// Não usar readline/promises + stdin não-interativo aqui: rl.question() encadeado trava
// indefinidamente quando o stdin inteiro chega de uma vez e fecha (achado ao escrever o teste
// deste script, E00-S06 Task 1) — o processo só morre por "unsettled top-level await".
function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const m = /^--([a-z]+)$/.exec(argv[i]);
    if (m) flags[m[1]] = argv[i + 1] ?? "";
  }
  return flags;
}

const flags = parseFlags(process.argv.slice(2));
const ROOT = resolve(flags.root || resolve(import.meta.dirname, ".."));
const ROADMAP = resolve(ROOT, "docs/epics/ROADMAP.md");
const SPECS_DIR = resolve(ROOT, "specs");
const TEMPLATES_DIR = resolve(ROOT, "specs/_templates");
const STORY_FILE = resolve(ROOT, ".current-story");

// ─── helpers ──────────────────────────────────────────────────────────────────

function pad2(n) {
  return String(n).padStart(2, "0");
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readTemplate(name) {
  const path = join(TEMPLATES_DIR, name);
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

// ─── coleta de dados ──────────────────────────────────────────────────────────

const modoFlags = flags.epico != null && flags.story != null && flags.descricao != null && flags.owner != null;

let epicNum, storyNum, descricao, owner, tier;
if (modoFlags) {
  ({ epico: epicNum, story: storyNum, descricao, owner, tier = "pequeno" } = flags);
} else {
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  📋 NOVA STORY — Sinérgica OS               ║");
  console.log("╚══════════════════════════════════════════════╝\n");
  console.log("Preencha os dados da story. Isso registrará no ROADMAP e criará os arquivos de spec.\n");

  epicNum = await rl.question("Épico (número, ex: 01): ");
  storyNum = await rl.question("Story (número dentro do épico, ex: 03): ");
  descricao = await rl.question("Descrição curta da story (ex: listagem de ordens de serviço): ");
  owner = await rl.question("Owner (seu nome, ex: Lucas / João / Claude): ");
  tier = await rl.question("Tier [trivial/pequeno/arquitetural] (Enter = pequeno): ");

  rl.close();
}

const epicId = `E${pad2(epicNum.trim())}`;
const storyId = `S${pad2(storyNum.trim())}`;
const fullId = `${epicId}-${storyId}`;
const tierFinal = ["trivial", "pequeno", "arquitetural"].includes(tier.trim().toLowerCase())
  ? tier.trim().toLowerCase()
  : "pequeno";
const slug = slugify(descricao);
const specDir = join(SPECS_DIR, `${fullId}-${slug}`);
const specPath = join(specDir, "spec.md");
const tasksPath = join(specDir, "tasks.md");

console.log(`\n→ Story ID: ${fullId}`);
console.log(`→ Pasta:    specs/${fullId}-${slug}/`);
console.log(`→ Tier:     ${tierFinal}`);
console.log(`→ Owner:    ${owner}\n`);

// ─── verificações ──────────────────────────────────────────────────────────────

if (existsSync(specDir)) {
  console.error(`❌ Pasta ${specDir} já existe. A story pode já estar registrada.`);
  process.exit(1);
}

// ─── criar arquivos ───────────────────────────────────────────────────────────

mkdirSync(specDir, { recursive: true });

// spec.md
const specTemplate = readTemplate("spec.template.md");
const specContent = specTemplate
  ? specTemplate
      .replace(/\{\{STORY_ID\}\}/g, fullId)
      .replace(/\{\{DESCRICAO\}\}/g, descricao)
      .replace(/\{\{TIER\}\}/g, tierFinal)
      .replace(/\{\{SLUG\}\}/g, slug)
  : `---
name: spec-${fullId}-${slug}
description: ${descricao}
alwaysApply: false
---

# Spec — ${fullId}: ${descricao}

> Épico: ${epicId} · Tier: ${tierFinal} · Status: **rascunho**

## Resumo
<!-- Descreva o objetivo da story em 2-3 frases. -->

## Critérios de aceite (AC)

### AC-1: [Título]
- Dado ...
- Quando ...
- Então ...

## Fora de escopo (VINCULANTE)
-

## Rastreabilidade
- Tasks: [tasks.md](tasks.md)
- Épico: [ROADMAP.md](../../docs/epics/ROADMAP.md)
`;

writeFileSync(specPath, specContent, "utf8");

// tasks.md
const tasksTemplate = readTemplate("tasks.template.md");
const tasksContent = tasksTemplate
  ? tasksTemplate
      .replace(/\{\{STORY_ID\}\}/g, fullId)
      .replace(/\{\{DESCRICAO\}\}/g, descricao)
  : `---
name: tasks-${fullId}-${slug}
description: Tasks da story ${fullId}: ${descricao}
alwaysApply: false
---

# Tasks — ${fullId}: ${descricao}

## Plano
| # | Task | Cobre AC | Gate | Status |
|----|------|----------|------|--------|
| 1 | | AC-1 | | ⬜ todo |

## Checklist de Definition of Done
- [ ] \`pnpm typecheck\` limpo
- [ ] \`pnpm lint\` limpo
- [ ] \`pnpm test\` verde
- [ ] Spec e tasks atualizados
- [ ] Story marcada como Implementado no ROADMAP
- [ ] \`docs/STATE.md\` atualizado
`;

writeFileSync(tasksPath, tasksContent, "utf8");

// ─── registrar no ROADMAP ─────────────────────────────────────────────────────

const roadmapContent = readFileSync(ROADMAP, "utf8");
// Heading real é nível 2 (`## E0N — Título`), não nível 3 — script gerava linha morta antes desta
// correção (achado ao escrever scripts/nova-story.test.mjs, E00-S06 Task 1).
const epicSection = `## ${epicId} —`;

// Schema real (8 colunas, ver docs/epics/ROADMAP.md): Story | Título | Descrição | Owner | Status
// | Spec | Concluída | Commit. Título/Descrição colapsam na mesma resposta interativa — refino é
// tarefa do @sm ao revisar a linha, não deste gerador.
const storyRow = `| ${fullId} | ${descricao} | ${descricao} | ${owner} | ⬜ | ⏳ | — | — |`;

let updatedRoadmap;
const epicIdx = roadmapContent.indexOf(epicSection);
if (epicIdx !== -1) {
  // Separador de tabela markdown (`|---|---|...`) é achado pela forma, não pelo texto das colunas
  // — headers variam entre épicos e mudam ao longo do tempo, a forma não.
  const linhas = roadmapContent.slice(epicIdx).split("\n");
  const sepIdx = linhas.findIndex((l) => /^\|[\s:|-]+\|$/.test(l.trim()));
  if (sepIdx === -1) {
    // fallback: append ao final da seção do épico
    updatedRoadmap = roadmapContent.replace(epicSection, `${epicSection}\n${storyRow}\n`);
  } else {
    let fim = sepIdx + 1;
    while (fim < linhas.length && linhas[fim].trim().startsWith("|")) fim++;
    linhas.splice(fim, 0, storyRow);
    updatedRoadmap = roadmapContent.slice(0, epicIdx) + linhas.join("\n");
  }
} else {
  console.warn(`⚠️  Seção "${epicSection}" não encontrada no ROADMAP. Adicione manualmente:`);
  console.warn(`   ${storyRow}`);
  updatedRoadmap = roadmapContent;
}

writeFileSync(ROADMAP, updatedRoadmap, "utf8");

// ─── .current-story ───────────────────────────────────────────────────────────

writeFileSync(STORY_FILE, fullId, "utf8");

// ─── resultado ────────────────────────────────────────────────────────────────

console.log("✅ Story registrada com sucesso!\n");
console.log(`  Spec:   specs/${fullId}-${slug}/spec.md`);
console.log(`  Tasks:  specs/${fullId}-${slug}/tasks.md`);
console.log(`  ROADMAP atualizado com owner: ${owner}`);
console.log(`  .current-story → ${fullId}\n`);
console.log("Próximos passos obrigatórios:");
console.log("  1. Edite spec.md — escreva os ACs em Given/When/Then");
console.log("  2. Edite tasks.md — quebre em tasks com referência de AC");
console.log(`  3. Commits devem ter escopo: feat(${fullId}): descrição`);
console.log("  4. Ao concluir: marque AC verdes no ROADMAP + atualize docs/STATE.md");
console.log("\n  Agentes recomendados: @pm → @sm → @dev → @qa → @devops\n");
