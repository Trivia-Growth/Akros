import type { Cliente } from "@/features/crm/domain/types";
import type { Fase, Jornada } from "@/features/jornada/domain/types";
import { criarFasesTemplate } from "./jornada-template";

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

// --- Persona 1: Carlos Mendes — recém-contratado, Fase 1 em andamento ---
const fasesCarlos = aplicarCorte(criarFasesTemplate(), 1, 1);
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
  },
  jornada: {
    id: "jornada-carlos",
    clienteId: "cliente-carlos",
    faseAtualId: "fase-1",
    fases: fasesCarlos,
  },
};

// --- Persona 2: Renata Alves — meio do processo, Fase 2 em andamento ---
const fasesRenata = aplicarCorte(criarFasesTemplate(), 2, 2);
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
  },
  jornada: {
    id: "jornada-renata",
    clienteId: "cliente-renata",
    faseAtualId: "fase-2",
    fases: fasesRenata,
  },
};

// --- Persona 3: Bruno Castro — aguardando USCIS, Fase 5 em andamento (pós-envio) ---
const fasesBruno = aplicarCorte(criarFasesTemplate(), 5, 1);
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
  },
  jornada: {
    id: "jornada-bruno",
    clienteId: "cliente-bruno",
    faseAtualId: "fase-5",
    fases: fasesBruno,
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
  },
  jornada: {
    id: "jornada-fernanda",
    clienteId: "cliente-fernanda",
    faseAtualId: "fase-5",
    fases: fasesCompletas(criarFasesTemplate()),
  },
};

export const personas: Persona[] = [personaCarlos, personaRenata, personaBruno, personaFernanda];
