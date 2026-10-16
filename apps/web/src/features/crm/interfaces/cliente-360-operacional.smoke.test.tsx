// E03-S07 (T040) — smoke test de render do fechamento da fase 3/US1: selo de cadastro
// incompleto (FR-013), fila "O que precisa de atenção" com pendências separadas por tipo
// (FR-002), e ausência de vazamento de nota interna na tela. Mesmo padrão de
// `ComunicacaoRealPage.test.tsx` (`vi.mock` do hook Supabase da tela, sem Zustand/mock-db — esta
// página não usa `useMockDb`, usa `useCliente360AdminSupabase`).
// @vitest-environment jsdom
import "@/shared/i18n/config";
import type { Contrato } from "@/features/crm/domain/contrato";
import type { Cliente } from "@/features/crm/domain/types";
import type { Documento } from "@/features/documentos/domain/types";
import type { Jornada } from "@/features/jornada/domain/types";
import type { Pagamento } from "@/features/pagamentos/domain/types";
import { renderWithRouter } from "@/shared/lib/test-utils";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

type DadosMock = {
  clientes: Cliente[];
  jornadas: Jornada[];
  documentos: Documento[];
  pagamentos: Pagamento[];
  reunioes: never[];
  conversas: never[];
  emails: never[];
  eventos: never[];
  contratos: Contrato[];
};

const estado = vi.hoisted(() => ({
  dados: null as DadosMock | null,
}));

vi.mock("../application/useCliente360AdminSupabase", () => ({
  useCliente360AdminSupabase: () => ({
    dados: estado.dados,
    carregando: false,
    erro: null,
    refetch: vi.fn(),
  }),
}));

import { Clientes360RealPage } from "./Clientes360RealPage";

function clienteBase(overrides: Partial<Cliente> = {}): Cliente {
  return {
    id: "cliente-1",
    nome: "Ana Souza",
    email: "ana@example.com",
    telefone: "+55 11 99999-0000",
    tipoVisto: "EB-2 NIW",
    caseManager: "Bruno",
    criadoEm: "2026-01-10T12:00:00Z",
    saude: "em_dia",
    ...overrides,
  };
}

function contratoBase(overrides: Partial<Contrato> = {}): Contrato {
  return {
    id: "contrato-1",
    clienteId: "cliente-1",
    programaId: "eb2-niw",
    programaVersao: "2026.1",
    prazoRespostaDiasUteis: 10,
    prioridade: "padrao",
    condicoes: [],
    registradoPor: "admin-1",
    registradoEm: "2026-02-01T12:00:00Z",
    ativo: true,
    ...overrides,
  };
}

function jornadaBase(overrides: Partial<Jornada> = {}): Jornada {
  return {
    id: "jornada-1",
    clienteId: "cliente-1",
    faseAtualId: "fase-1",
    fases: [],
    ...overrides,
  };
}

function dadosVazios(): DadosMock {
  return {
    clientes: [],
    jornadas: [],
    documentos: [],
    pagamentos: [],
    reunioes: [],
    conversas: [],
    emails: [],
    eventos: [],
    contratos: [],
  };
}

/** Abre o detalhe do cliente a partir da lista (`Clientes360RealPage` renderiza a lista primeiro —
 *  não há rota direta para o 360 nesta tela). */
function abrirDetalhe(nomeCliente: string) {
  const linha = screen.getByText(nomeCliente).closest("button");
  if (!linha) throw new Error(`Linha do cliente "${nomeCliente}" não encontrada`);
  fireEvent.click(linha);
}

describe("Clientes360RealPage — cabeçalho operacional (T036-041)", () => {
  afterEach(() => {
    cleanup();
    estado.dados = null;
  });

  it("FR-013: cliente sem contrato ativo mostra o selo de cadastro incompleto", () => {
    estado.dados = {
      ...dadosVazios(),
      clientes: [clienteBase()],
      // Sem jornada e sem contrato — o caso mais incompleto possível.
    };
    renderWithRouter(<Clientes360RealPage />, ["/admin/clientes"]);
    abrirDetalhe("Ana Souza");

    expect(screen.getByTestId("selo-cadastro-incompleto")).toBeTruthy();
  });

  it("FR-013 (lado oposto): contrato ativo + levantamento conferido + zero pendências NÃO mostra o selo", () => {
    estado.dados = {
      ...dadosVazios(),
      clientes: [clienteBase()],
      contratos: [contratoBase()],
      jornadas: [jornadaBase({ levantamentoEstado: "conferido" })],
      documentos: [],
      pagamentos: [],
    };
    renderWithRouter(<Clientes360RealPage />, ["/admin/clientes"]);
    abrirDetalhe("Ana Souza");

    expect(screen.queryByTestId("selo-cadastro-incompleto")).toBeNull();
  });

  it("FR-002: documentos e pagamentos pendentes aparecem separados por tipo na fila de atenção, não somados", () => {
    estado.dados = {
      ...dadosVazios(),
      clientes: [clienteBase()],
      contratos: [contratoBase()],
      jornadas: [jornadaBase({ levantamentoEstado: "conferido" })],
      documentos: [
        {
          id: "doc-1",
          clienteId: "cliente-1",
          nome: "Currículo",
          tipo: "curriculo",
          status: "pendente",
        },
        { id: "doc-2", clienteId: "cliente-1", nome: "Diploma", tipo: "outro", status: "ajustes" },
        {
          id: "doc-3",
          clienteId: "cliente-1",
          nome: "Carta",
          tipo: "carta_recomendacao",
          status: "em_analise",
        },
      ],
      pagamentos: [
        {
          id: "pag-1",
          clienteId: "cliente-1",
          descricao: "Entrada",
          valor: 1000,
          moeda: "BRL",
          status: "pendente",
          vencimento: "2026-03-01",
          tipo: "entrada",
        },
        {
          id: "pag-2",
          clienteId: "cliente-1",
          descricao: "Parcela 1",
          valor: 500,
          moeda: "BRL",
          status: "em_conferencia",
          vencimento: "2026-03-10",
          tipo: "parcela",
        },
      ],
    };
    renderWithRouter(<Clientes360RealPage />, ["/admin/clientes"]);
    abrirDetalhe("Ana Souza");

    const fila = screen.getByTestId("fila-atencao");
    // 3 documentos (pendente+ajustes do cliente, em_analise da Akros) e 2 pagamentos
    // (pendente do cliente, em_conferencia da Akros) — duas linhas distintas, nunca "5".
    expect(fila.textContent).toMatch(/3 pending document/);
    expect(fila.textContent).toMatch(/2 open payment/);
    expect(fila.textContent).not.toMatch(/\b5\b/);
  });

  it("não vaza dado de nota interna no DTO consumido pela tela " +
    "(proxy: esta fase ainda não tem UI de nota interna — garante ausência de vazamento, " +
    "não uma feature de ocultação que não existe ainda)", () => {
    const SENTINELA = "NOTA-INTERNA-NAO-RENDERIZAVEL-9f3a";
    estado.dados = {
      ...dadosVazios(),
      clientes: [clienteBase()],
      // `observacao` do contrato é devolvida pelo adapter mas esta fase não a renderiza em
      // lugar nenhum da tela — serve de proxy para quando `crm.notas_internas` ganhar porta.
      contratos: [contratoBase({ observacao: SENTINELA })],
      jornadas: [jornadaBase({ levantamentoEstado: "conferido" })],
    };
    renderWithRouter(<Clientes360RealPage />, ["/admin/clientes"]);
    abrirDetalhe("Ana Souza");

    expect(screen.queryByText(SENTINELA)).toBeNull();
  });
});
