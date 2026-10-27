import { expect, it, vi } from "vitest";
const { schema, from, select, eq, maybeSingle } = vi.hoisted(() => ({
  schema: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("@/shared/supabase/client", () => ({ getSupabase: () => ({ schema }) }));
import { SupabaseVinculoPastaConsulta } from "./SupabaseVinculoPastaConsulta";

it("consulta vínculo restrito ao cliente e jornada", async () => {
  schema.mockReturnValue({ from });
  from.mockReturnValue({ select });
  select.mockReturnValue({ eq });
  eq.mockReturnValue({ eq, maybeSingle });
  maybeSingle.mockResolvedValue({
    data: { folder_item_id: "pasta-1", estado: "ativo" },
    error: null,
  });
  expect(await new SupabaseVinculoPastaConsulta().carregar("cliente-1", "jornada-1")).toEqual({
    folderItemId: "pasta-1",
    estado: "ativo",
  });
  expect(schema).toHaveBeenCalledWith("arquivos");
  expect(from).toHaveBeenCalledWith("vinculos_pasta");
  expect(eq).toHaveBeenCalledWith("cliente_id", "cliente-1");
  expect(eq).toHaveBeenCalledWith("jornada_id", "jornada-1");
});
