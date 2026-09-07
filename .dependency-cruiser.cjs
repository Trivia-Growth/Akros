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
      // E15-S02 — dieta do chunk de entrada (AC-1/AC-2). O esqueleto que carrega no primeiro
      // paint (main → App → router/rota → layouts → bootstrap de sessão/i18n) não pode importar
      // a camada de dado: `src/mocks/`, adapters `Supabase*` (arrastam `@supabase/supabase-js`,
      // ~220 kB) nem o container (`app/di`, `app/real-repositories`). O container importa tudo
      // estaticamente POR DESIGN — o que o mantém fora do entry é que todo consumidor dele é
      // lazy. Uma única importação estática aqui recoloca mocks+supabase-js no caminho crítico.
      name: "entrada-nao-puxa-mocks-nem-supabase",
      severity: "error",
      comment:
        "chunk de entrada em dieta: main/App/router/layouts/bootstrap não importam mocks/, adapters Supabase* nem app/di|real-repositories (E15-S02)",
      from: {
        path: "^apps/web/src/(main\\.tsx|app/(App|router|rota|sessao-service)|shared/layout/(Public|Portal|Admin)Layout|shared/i18n/config|features/sessao/(application/hooks|interfaces/RequireRole))",
      },
      to: {
        path: "^apps/web/src/(mocks/|app/(di|real-repositories)|.*/infrastructure/Supabase)",
      },
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
