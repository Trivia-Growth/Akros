import { carregarComRetry } from "@/shared/lib/carregar-com-retry";
import { ErrorBoundary } from "@/shared/ui/ErrorBoundary";
import { Skeleton } from "@/shared/ui/Skeleton";
import { type ComponentType, Suspense, lazy } from "react";

/** Fallback de carregamento — mesma linguagem visual do resto, sem componente novo. */
function EsqueletoDeRota() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-8 w-2/5" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

interface Opcoes {
  /** Nome da área para o usuário — aparece no fallback de erro. */
  area: string;
  /** Rota conhecida como boa, para o fallback oferecer saída. */
  voltarPara: string;
  rotuloVoltar: string;
}

/**
 * Monta uma rota isolada (E15-S01): chunk próprio, retry no carregamento e fronteira de falha.
 *
 * As três camadas juntas em um lugar só, de propósito — se cada rota montasse a sua, a próxima
 * rota adicionada esqueceria uma delas. Ordem importa: o `ErrorBoundary` fica **por fora** do
 * `Suspense` para também capturar a falha do próprio `import()`, não só o erro de render.
 *
 * As páginas são named exports; o `.then` abaixo é o que as adapta ao contrato de `React.lazy`.
 */
export function rota(
  { area, voltarPara, rotuloVoltar }: Opcoes,
  carregar: () => Promise<{ default: ComponentType }>,
) {
  const Pagina = lazy(() => carregarComRetry(carregar));
  return (
    <ErrorBoundary area={area} voltarPara={voltarPara} rotuloVoltar={rotuloVoltar}>
      <Suspense fallback={<EsqueletoDeRota />}>
        <Pagina />
      </Suspense>
    </ErrorBoundary>
  );
}

/** Atalhos por frente — a área e a saída são sempre as mesmas dentro de cada uma. */
export const site = { area: "o site", voltarPara: "/", rotuloVoltar: "Ir para a página inicial" };
export const portal = {
  area: "o portal",
  voltarPara: "/portal",
  rotuloVoltar: "Voltar ao meu painel",
};
export const admin = {
  area: "o painel admin",
  voltarPara: "/admin",
  rotuloVoltar: "Voltar ao dashboard",
};
