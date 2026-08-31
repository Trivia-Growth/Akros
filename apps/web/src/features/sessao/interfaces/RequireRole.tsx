import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCarregandoSessao, useSessaoAtual } from "../application/hooks";
import type { Papel } from "../domain/types";

/** Guarda de rota (AC-3). Só usado quando `!isDemoMode` — ver `app/router.tsx`. */
export function RequireRole({ papel, children }: { papel: Papel; children: ReactNode }) {
  const sessao = useSessaoAtual();
  const carregando = useCarregandoSessao();

  if (carregando) return null;
  if (!sessao || sessao.usuario.papel !== papel) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
