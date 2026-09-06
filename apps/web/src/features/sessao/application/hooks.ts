import { sessaoService } from "@/app/sessao-service";
import { isDemoMode } from "@/shared/lib/env";
import { useEffect, useRef } from "react";
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
 * O refresh nasce no primeiro mount, antes de o usuário poder enviar login. Se essa resposta sem
 * cookie volta depois do login, ela não pode apagar token recém-obtido na memória.
 */
export function aplicarSessaoReidratada(sessao: Sessao | null): void {
  const estado = useSessaoStore.getState();
  if (estado.sessao) return;
  estado.definirSessao(sessao);
}

/**
 * Rehidrata a sessão no boot da app (F5) via `sessao-refresh` — ADR-0008. Chamar uma vez, na raiz
 * (`app/App.tsx`). Em modo demo (`isDemoMode`) não faz nenhuma chamada de rede — a demo ao vivo da
 * Akros não pode depender do backend de sessão estar no ar.
 */
export function useBootstrapSessao(): void {
  const definirCarregando = useSessaoStore((s) => s.definirCarregando);
  const refreshInicial = useRef<Promise<Sessao | null> | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      definirCarregando(false);
      return;
    }
    let cancelado = false;
    // React StrictMode repete setup+cleanup de effects no desenvolvimento. Compartilhar a mesma
    // promessa mantém o segundo setup inscrito na resposta e evita duas chamadas que esgotariam
    // o teto de `sessao-refresh` durante navegações E2E com reload de documento.
    refreshInicial.current ??= sessaoService.refresh();
    refreshInicial.current
      .then((sessao) => {
        if (!cancelado) aplicarSessaoReidratada(sessao);
      })
      .finally(() => {
        if (!cancelado) definirCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [definirCarregando]);
}

export async function login(email: string, senha: string): Promise<void> {
  const sessao = await sessaoService.login(email, senha);
  useSessaoStore.getState().definirSessao(sessao);
}

export async function logout(): Promise<void> {
  const accessToken = useSessaoStore.getState().sessao?.accessToken ?? null;
  await sessaoService.logout(accessToken);
  useSessaoStore.getState().definirSessao(null);
}
