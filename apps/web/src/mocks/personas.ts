import type { Cliente } from "@/features/crm/domain/types";
import { instanciarJornada } from "@/features/jornada/application/instanciar-jornada";
import type { Fase, Jornada } from "@/features/jornada/domain/types";
import { programaEb2Niw, programaReligiosoREb4 } from "./programas";

export interface Persona {
  cliente: Cliente;
  jornada: Jornada;
}

/**
 * Aplica um "corte" na trilha: fases antes do índice = concluída (etapas todas concluídas);
 * fase no índice = em_andamento (etapas parcialmente concluídas conforme etapasConcluidas);
 * fases depois = bloqueada. A fase 0 (Introdução) nasce sempre liberada por padrão.
 */
function aplicarCorte(fases: Fase[], indiceAtual: number, etapasConcluidas = 0): Fase[] {
  return fases.map((fase, idx) => {
    if (idx < indiceAtual) {
      return {
        ...fase,
        status: "concluida",
        etapas: fase.etapas.map((e) => ({ ...e, status: "concluida" })),
      };
    }
    if (idx === indiceAtual) {
      return {
        ...fase,
        status: "em_andamento",
        etapas: fase.etapas.map((e, i) => ({
          ...e,
          status: i < etapasConcluidas ? "concluida" : "pendente",
          desdeEm: i < etapasConcluidas ? undefined : "2026-07-01T09:00:00-03:00",
        })),
      };
    }
    return { ...fase, status: "bloqueada" };
  });
}

function fasesCompletas(fases: Fase[]): Fase[] {
  return fases.map((fase) => ({
    ...fase,
    status: "concluida" as const,
    etapas: fase.etapas.map((e) => ({ ...e, status: "concluida" as const })),
  }));
}

/** E09-S02 — datas reais de conclusão para demonstrar o fator de ritmo (Renata está "atencao"). */
function comHistoricoDeRitmo(fases: Fase[]): Fase[] {
  const datas: Record<string, { iniciadaEm: string; concluidaRealEm: string }> = {
    "intro-1": {
      iniciadaEm: "2026-04-15T09:00:00-03:00",
      concluidaRealEm: "2026-04-16T09:00:00-03:00",
    },
    "intro-2": {
      iniciadaEm: "2026-04-16T09:00:00-03:00",
      concluidaRealEm: "2026-04-18T09:00:00-03:00",
    },
    "f1-1": {
      iniciadaEm: "2026-04-18T09:00:00-03:00",
      concluidaRealEm: "2026-04-20T09:00:00-03:00",
    },
    "f1-3": {
      iniciadaEm: "2026-04-20T09:00:00-03:00",
      concluidaRealEm: "2026-05-25T09:00:00-03:00",
    },
  };
  return fases.map((fase) => ({
    ...fase,
    etapas: fase.etapas.map((e) => (datas[e.id] ? { ...e, ...datas[e.id] } : e)),
  }));
}

// --- Persona 1: Carlos Mendes — recém-contratado, Fase 1 em andamento ---
const fasesCarlos = aplicarCorte(
  instanciarJornada(programaEb2Niw, "cliente-carlos", "jornada-carlos").fases,
  1,
  1,
);
export const personaCarlos: Persona = {
  cliente: {
    id: "cliente-carlos",
    leadOrigemId: "lead-fechado-carlos",
    nome: "Carlos Mendes",
    email: "carlos.mendes@example.com",
    telefone: "+55 11 98888-1001",
    tipoVisto: "EB-2 NIW",
    caseManager: "Natalia Luz",
    criadoEm: "2026-06-02T10:00:00-03:00",
    saude: "em_dia",
    programaId: "eb2-niw",
    programaVersao: "1.0",
  },
  jornada: {
    id: "jornada-carlos",
    clienteId: "cliente-carlos",
    faseAtualId: "fase-1",
    fases: fasesCarlos,
    programaId: "eb2-niw",
    programaVersao: "1.0",
  },
};

// --- Persona 2: Renata Alves — meio do processo, Fase 2 em andamento, ritmo lento ---
const fasesRenata = comHistoricoDeRitmo(
  aplicarCorte(instanciarJornada(programaEb2Niw, "cliente-renata", "jornada-renata").fases, 2, 2),
);
export const personaRenata: Persona = {
  cliente: {
    id: "cliente-renata",
    leadOrigemId: "lead-fechado-renata",
    nome: "Renata Alves",
    email: "renata.alves@example.com",
    telefone: "+55 21 97777-2002",
    tipoVisto: "EB-2 NIW",
    caseManager: "Natalia Luz",
    criadoEm: "2026-04-15T14:30:00-03:00",
    saude: "atencao",
    programaId: "eb2-niw",
    programaVersao: "1.0",
  },
  jornada: {
    id: "jornada-renata",
    clienteId: "cliente-renata",
    faseAtualId: "fase-2",
    fases: fasesRenata,
    programaId: "eb2-niw",
    programaVersao: "1.0",
  },
};

// --- Persona 3: Bruno Castro — aguardando USCIS, Fase 5 em andamento (pós-envio) ---
const fasesBruno = aplicarCorte(
  instanciarJornada(programaEb2Niw, "cliente-bruno", "jornada-bruno").fases,
  5,
  1,
);
export const personaBruno: Persona = {
  cliente: {
    id: "cliente-bruno",
    leadOrigemId: "lead-fechado-bruno",
    nome: "Bruno Castro",
    email: "bruno.castro@example.com",
    telefone: "+55 31 96666-3003",
    tipoVisto: "EB-2 NIW",
    caseManager: "Natalia Luz",
    criadoEm: "2025-11-20T09:15:00-03:00",
    saude: "em_dia",
    programaId: "eb2-niw",
    programaVersao: "1.0",
  },
  jornada: {
    id: "jornada-bruno",
    clienteId: "cliente-bruno",
    faseAtualId: "fase-5",
    fases: fasesBruno,
    programaId: "eb2-niw",
    programaVersao: "1.0",
  },
};

// --- Persona 4: Fernanda Lima — aprovado, jornada 100% concluída ---
export const personaFernanda: Persona = {
  cliente: {
    id: "cliente-fernanda",
    leadOrigemId: "lead-fechado-fernanda",
    nome: "Fernanda Lima",
    email: "fernanda.lima@example.com",
    telefone: "+55 41 95555-4004",
    tipoVisto: "EB-2 NIW",
    caseManager: "Natalia Luz",
    criadoEm: "2025-05-10T11:00:00-03:00",
    saude: "em_dia",
    programaId: "eb2-niw",
    programaVersao: "1.0",
  },
  jornada: {
    id: "jornada-fernanda",
    clienteId: "cliente-fernanda",
    faseAtualId: "fase-5",
    fases: fasesCompletas(
      instanciarJornada(programaEb2Niw, "cliente-fernanda", "jornada-fernanda").fases,
    ),
    programaId: "eb2-niw",
    programaVersao: "1.0",
  },
};

// --- Persona 5: Igreja Vida Nova — programa religioso R/EB-4 (E06-S02), Fase 1 em andamento ---
const fasesIgreja = aplicarCorte(
  instanciarJornada(programaReligiosoREb4, "cliente-igreja", "jornada-igreja").fases,
  1,
  0,
);
export const personaIgreja: Persona = {
  cliente: {
    id: "cliente-igreja",
    leadOrigemId: "lead-fechado-igreja",
    nome: "Igreja Vida Nova (Pr. Ezequiel Moraes)",
    email: "contato@igrejavidanova.example.com",
    telefone: "+55 19 94444-5005",
    tipoVisto: "Visto Religioso (R/EB-4)",
    caseManager: "Natalia Luz",
    criadoEm: "2026-07-10T09:00:00-03:00",
    saude: "em_dia",
    programaId: "religioso-r-eb4",
    programaVersao: "1.0",
  },
  jornada: {
    id: "jornada-igreja",
    clienteId: "cliente-igreja",
    faseAtualId: "rel-fase-1",
    fases: fasesIgreja,
    programaId: "religioso-r-eb4",
    programaVersao: "1.0",
  },
};

export const personas: Persona[] = [
  personaCarlos,
  personaRenata,
  personaBruno,
  personaFernanda,
  personaIgreja,
];
