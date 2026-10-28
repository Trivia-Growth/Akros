import { container } from "@/app/di";
import { isDemoMode } from "@/shared/lib/env";
import { useEffect } from "react";
import type { Papel, Sessao } from "../domain/types";
import { useSessaoStore } from "./store";

export function useSessaoAtual(): Sessao | null {
  return useSessaoStore((s) => s.sessao);
}

export function useCarregandoSessao(): boolean {
  return useSessaoStore((s) => s.carregando);
}

export function useTemPapel(papel: Papel): boolean {
  return useSessaoStore((s) => s.sessao?.usuario.papel === papel);
}

/**
 * Rehidrata a sessão no boot da app (F5) via `sessao-refresh` — ADR-0008. Chamar uma vez, na raiz
 * (`app/App.tsx`). Em modo demo (`isDemoMode`) não faz nenhuma chamada de rede — a demo ao vivo da
 * Akros não pode depender do backend de sessão estar no ar.
 */
export function useBootstrapSessao(): void {
  const definirSessao = useSessaoStore((s) => s.definirSessao);
  const definirCarregando = useSessaoStore((s) => s.definirCarregando);

  useEffect(() => {
    if (isDemoMode) {
      definirCarregando(false);
      return;
    }
    let cancelado = false;
    container.sessao
      .refresh()
      .then((sessao) => {
        if (!cancelado) definirSessao(sessao);
      })
      .finally(() => {
        if (!cancelado) definirCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [definirSessao, definirCarregando]);
}

export async function login(email: string, senha: string): Promise<void> {
  const sessao = await container.sessao.login(email, senha);
  useSessaoStore.getState().definirSessao(sessao);
}

export async function logout(): Promise<void> {
  const accessToken = useSessaoStore.getState().sessao?.accessToken ?? null;
  await container.sessao.logout(accessToken);
  useSessaoStore.getState().definirSessao(null);
}
