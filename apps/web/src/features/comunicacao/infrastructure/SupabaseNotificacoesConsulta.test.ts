import { describe, expect, it, vi } from "vitest";
import { SupabaseNotificacoesConsulta } from "./SupabaseNotificacoesConsulta";

const {
  schema,
  fromVistoAdmin,
  selectVistoAdmin,
  maybeSingle,
  selectEventos,
  eq,
  gt,
  order,
  limit,
  returnsEventos,
  fromClientes,
  selectClientes,
  inClientes,
  returnsClientes,
  upsert,
  getUser,
} = vi.hoisted(() => ({
  schema: vi.fn(),
  fromVistoAdmin: vi.fn(),
  selectVistoAdmin: vi.fn(),
  maybeSingle: vi.fn(),
  selectEventos: vi.fn(),
  eq: vi.fn(),
  gt: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  returnsEventos: vi.fn(),
  fromClientes: vi.fn(),
  selectClientes: vi.fn(),
  inClientes: vi.fn(),
  returnsClientes: vi.fn(),
  upsert: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/shared/supabase/client", () => ({
  getSupabase: () => ({ schema, auth: { getUser } }),
}));

function montarEncadeamentoDeLeitura() {
  schema.mockImplementation((nome: string) => {
    if (nome === "comunicacao") {
      return {
        from: (tabela: string) => {
          if (tabela === "visto_admin") return { select: selectVistoAdmin };
          if (tabela === "eventos") return { select: selectEventos };
          throw new Error(`tabela inesperada: ${tabela}`);
        },
      };
    }
    if (nome === "crm") {
      return { from: fromClientes };
    }
    throw new Error(`schema inesperado: ${nome}`);
  });
  selectVistoAdmin.mockReturnValue({ maybeSingle });
  selectEventos.mockReturnValue({ eq });
  eq.mockImplementation(() => ({ eq, gt }));
  gt.mockReturnValue({ order });
  order.mockReturnValue({ limit });
  limit.mockReturnValue({ returns: returnsEventos });
  fromClientes.mockReturnValue({ select: selectClientes });
  selectClientes.mockReturnValue({ in: inClientes });
  inClientes.mockReturnValue({ returns: returnsClientes });
}

describe("SupabaseNotificacoesConsulta", () => {
  it("lista o cliente com mensagem depois do cursor salvo", async () => {
    montarEncadeamentoDeLeitura();
    maybeSingle.mockResolvedValue({ data: { visto_em: "2026-11-09T10:00:00Z" }, error: null });
    returnsEventos.mockResolvedValue({
      data: [{ cliente_id: "cliente-1", ocorrido_em: "2026-11-09T12:00:00Z" }],
      error: null,
    });
    returnsClientes.mockResolvedValue({
      data: [{ id: "cliente-1", nome: "Carlos Mendes" }],
      error: null,
    });

    const resultado = await new SupabaseNotificacoesConsulta().naoVistas();

    expect(resultado).toEqual([
      { clienteId: "cliente-1", nomeCliente: "Carlos Mendes", ocorridoEm: "2026-11-09T12:00:00Z" },
    ]);
    expect(gt).toHaveBeenCalledWith("ocorrido_em", "2026-11-09T10:00:00Z");
  });

  it("sem cursor salvo, usa época e ainda assim funciona", async () => {
    montarEncadeamentoDeLeitura();
    maybeSingle.mockResolvedValue({ data: null, error: null });
    returnsEventos.mockResolvedValue({ data: [], error: null });

    const resultado = await new SupabaseNotificacoesConsulta().naoVistas();

    expect(resultado).toEqual([]);
    expect(gt).toHaveBeenCalledWith("ocorrido_em", "1970-01-01T00:00:00Z");
  });

  it("marcarVisto grava o cursor com o id do admin autenticado", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
    schema.mockReturnValue({ from: fromVistoAdmin });
    fromVistoAdmin.mockReturnValue({ upsert });
    upsert.mockResolvedValue({ error: null });

    await new SupabaseNotificacoesConsulta().marcarVisto();

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ admin_id: "admin-1" }));
  });

  it("marcarVisto sem sessão lança erro em vez de gravar cursor vazio", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(new SupabaseNotificacoesConsulta().marcarVisto()).rejects.toThrow("sem_sessao");
  });
});
