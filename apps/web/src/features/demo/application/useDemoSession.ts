import { create } from "zustand";

export type PapelAtivo = "cliente" | "admin";

interface DemoSessionState {
  personaId: string;
  papel: PapelAtivo;
  cenarioAtivo: string;
  setPersona: (id: string) => void;
  setPapel: (papel: PapelAtivo) => void;
  setCenario: (id: string) => void;
}

export const PERSONA_PADRAO = "cliente-carlos";

export const useDemoSession = create<DemoSessionState>((set) => ({
  personaId: PERSONA_PADRAO,
  papel: "cliente",
  cenarioAtivo: "padrao",
  setPersona: (id) => set({ personaId: id }),
  setPapel: (papel) => set({ papel }),
  setCenario: (id) => set({ cenarioAtivo: id }),
}));
