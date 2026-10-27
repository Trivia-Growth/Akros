// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentosRealPage } from "./DocumentosRealPage";

const { enviar, baixar, estado } = vi.hoisted(() => ({
  enviar: vi.fn(),
  baixar: vi.fn(),
  estado: { versoes: [] as Array<Record<string, unknown>> },
}));
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
    versoes: estado.versoes,
    estadoRecebimento: "ocioso",
    estadoArmazenamento: "pendente",
    progresso: 0,
    erro: null,
    enviar,
    consultar: vi.fn(),
  }),
}));
vi.mock("../application/useDownloadDocumento", () => ({
  useDownloadDocumento: () => ({ baixar, baixando: false, erro: false }),
}));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe("envio-documento smoke", () => {
  beforeEach(() => {
    enviar.mockReset().mockResolvedValue(undefined);
    baixar.mockReset().mockResolvedValue(undefined);
    estado.versoes = [];
  });

  it("anuncia o limite antes do envio e aceita a interação de selecionar/enviar PDF", async () => {
    render(<DocumentosRealPage />);
    expect(screen.getByText("upload.maxSize")).toBeInTheDocument();
    const arquivo = new File(["%PDF-1.7"], "passaporte.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("upload.selectFile"), { target: { files: [arquivo] } });
    fireEvent.click(screen.getByRole("button", { name: "upload.upload" }));
    await waitFor(() => expect(enviar).toHaveBeenCalledWith(arquivo));
  });

  it("oferece download apenas para versão já armazenada", async () => {
    estado.versoes = [
      {
        id: "armazenada",
        numeroVersao: 1,
        nomeOriginal: "arquivo.pdf",
        estadoRecebimento: "recebida",
        estadoArmazenamento: "armazenado",
        criadaEm: "2026-10-01",
      },
      {
        id: "pendente",
        numeroVersao: 2,
        nomeOriginal: "pendente.pdf",
        estadoRecebimento: "recebida",
        estadoArmazenamento: "pendente",
        criadaEm: "2026-10-01",
      },
    ];
    render(<DocumentosRealPage />);
    const botoes = screen.getAllByRole("button", { name: "upload.download" });
    expect(botoes).toHaveLength(1);
    fireEvent.click(botoes[0]);
    await waitFor(() => expect(baixar).toHaveBeenCalledWith("armazenada", "arquivo.pdf"));
  });
});
