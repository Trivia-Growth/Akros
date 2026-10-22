// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentosRealPage } from "./DocumentosRealPage";

const { enviar } = vi.hoisted(() => ({ enviar: vi.fn() }));
vi.mock("../application/real-hooks", () => ({
  useDocumentosClienteReal: () => ({
    documentos: [
      { id: "doc-1", clienteId: "case-1", nome: "Passaporte", tipo: "outro", status: "pendente" },
    ],
    solicitacoes: [],
    carregando: false,
    erro: null,
  }),
}));
vi.mock("../application/useEnvioDocumento", () => ({
  useEnvioDocumento: () => ({
    versoes: [],
    estadoRecebimento: "ocioso",
    estadoArmazenamento: "pendente",
    progresso: 0,
    erro: null,
    enviar,
    consultar: vi.fn(),
  }),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe("envio-documento smoke", () => {
  beforeEach(() => enviar.mockReset().mockResolvedValue(undefined));

  it("anuncia o limite antes do envio e aceita a interação de selecionar/enviar PDF", async () => {
    render(<DocumentosRealPage />);
    expect(screen.getByText("upload.maxSize")).toBeInTheDocument();
    const arquivo = new File(["%PDF-1.7"], "passaporte.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("upload.selectFile"), { target: { files: [arquivo] } });
    fireEvent.click(screen.getByRole("button", { name: "upload.upload" }));
    await waitFor(() => expect(enviar).toHaveBeenCalledWith(arquivo));
  });
});
