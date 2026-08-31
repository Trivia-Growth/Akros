/**
 * Fitness function da arquitetura (gate: pnpm run arch:check).
 * Verifica POR MÁQUINA a regra de dependência do CLAUDE.md:
 *   interfaces → application → domain ← infrastructure
 * Adaptado à estrutura real do monorepo OS: apps/web/src/features/<domínio>/
 * {domain,application,infrastructure,pages,components,hooks}. domain/ não importa
 * framework, I/O nem outras camadas. Falha o build se violar.
 */
module.exports = {
  forbidden: [
    {
      name: "domain-nao-importa-camadas",
      severity: "error",
      comment:
        "domain/ é puro: não importa application/, infrastructure/ nem a borda (pages/components/hooks)",
      from: { path: "^apps/web/src/features/[^/]+/domain" },
      to: {
        path: "^apps/web/src/features/[^/]+/(application|infrastructure|pages|components|hooks)",
      },
    },
    {
      name: "domain-nao-importa-framework",
      severity: "error",
      comment: "domain/ não importa nada de node_modules (framework/I-O) — lógica pura",
      from: { path: "^apps/web/src/features/[^/]+/domain" },
      to: { dependencyTypes: ["npm", "npm-dev"] },
    },
    {
      name: "application-nao-importa-borda-nem-infra",
      severity: "error",
      comment:
        "application/ orquestra casos de uso; não importa infrastructure/ nem a borda (pages/components/hooks)",
      from: { path: "^apps/web/src/features/[^/]+/application" },
      to: { path: "^apps/web/src/features/[^/]+/(infrastructure|pages|components|hooks)" },
    },
    {
      // E15-S01 / E00-S06 invariante 3 — isolamento entre frentes.
      //
      // Descoberta ao implementar: as três frentes NÃO mapeiam uma-para-uma em pastas de feature.
      // Portal e admin compartilham bounded context de propósito (`crm` tem `PerfilPage`, que é
      // do portal, e `Clientes360Page`, que é do admin) — proibir importação entre eles seria
      // proibir o desenho correto. A fronteira que existe de verdade é o site institucional:
      // ele não conhece nenhum outro domínio, e nenhum domínio conhece ele.
      //
      // Entre portal e admin o isolamento é de CHUNK e de fronteira de falha (React.lazy +
      // ErrorBoundary por rota), não de importação. Ver specs/E15-S01-resiliencia-modulo/.
      name: "site-nao-se-mistura-com-o-resto",
      severity: "error",
      comment:
        "features/site é o site institucional (canal de captação): não importa outro domínio nem é importado por um",
      from: { path: "^apps/web/src/features/site" },
      to: {
        path: "^apps/web/src/features/(?!site)",
      },
    },
    {
      name: "resto-nao-importa-site",
      severity: "error",
      comment:
        "nenhum domínio depende do site institucional — a dependência seria acoplamento reverso",
      from: { path: "^apps/web/src/features/(?!site)" },
      to: { path: "^apps/web/src/features/site" },
    },
    {
      name: "sem-dependencia-circular",
      severity: "error",
      comment: "Ciclo entre módulos é acoplamento escondido",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    // Sem isto o gate NÃO vê `import type` — ele some na compilação, e a regra de dependência
    // ficava cega justamente para o caso mais fácil de violar sem perceber (`domain/` importando
    // um tipo de `infrastructure/`). Descoberto ao escrever o teste do próprio gate
    // (scripts/arch-rules.test.mjs, E00-S06 invariante 1).
    tsPreCompilationDeps: true,
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: require("node:path").join(__dirname, "apps/web/tsconfig.json") },
    exclude: { path: "\\.(test|spec)\\.tsx?$" },
  },
};
