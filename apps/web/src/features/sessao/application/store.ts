import { create } from "zustand";
import type { Sessao } from "../domain/types";

interface SessaoState {
  /** ADR-0008: só em memória de módulo — nunca `persist`, nunca localStorage/sessionStorage. */
  sessao: Sessao | null;
  carregando: boolean;
  definirSessao: (sessao: Sessao | null) => void;
  definirCarregando: (carregando: boolean) => void;
}

export const useSessaoStore = create<SessaoState>((set) => ({
  sessao: null,
  carregando: true,
  definirSessao: (sessao) => set({ sessao }),
  definirCarregando: (carregando) => set({ carregando }),
}));
