import { container } from "@/app/di";
import { beforeEach, describe, expect, it } from "vitest";
import { useMockDb } from "./store";

describe("ações do portal (E02-S03..S07)", () => {
  beforeEach(() => {
    useMockDb.getState().resetarDemo();
  });

  it("E02-S03/E07-S01 AC-2: registrarEnvio muda status do documento para 'em_analise' (a IA analisa antes da fila humana)", async () => {
    await container.documentos.registrarEnvio("doc-carlos-diploma", "/mock-files/x.pdf");
    const doc = await container.documentos.obter("doc-carlos-diploma");
    expect(doc?.status).toBe("em_analise");
    expect(doc?.urlMock).toBe("/mock-files/x.pdf");
  });

  it("E02-S04 AC-2: assinar muda status da solicitação para 'assinado' com autor e data", async () => {
    await container.assinatura.assinar("assinatura-renata-cartas", "Renata Alves");
    const lista = await container.assinatura.listarPorCliente("cliente-renata");
    const alvo = lista.find((s) => s.id === "assinatura-renata-cartas");
    expect(alvo?.status).toBe("assinado");
    expect(alvo?.assinadoPor).toBe("Renata Alves");
    expect(alvo?.assinadoEm).toBeDefined();
  });

  it("E02-S05 AC-2: marcarComoPago muda status do pagamento", async () => {
    await container.pagamentos.marcarComoPago("pag-renata-parcela-2");
    const pagamentos = await container.pagamentos.listarPorCliente("cliente-renata");
    const alvo = pagamentos.find((p) => p.id === "pag-renata-parcela-2");
    expect(alvo?.status).toBe("pago");
    expect(alvo?.pagoEm).toBeDefined();
  });

  it("E02-S06 AC-2: agendar cria reunião com status 'agendada'", async () => {
    const antes = (await container.agenda.listarPorCliente("cliente-carlos")).length;

    const reuniao = await container.agenda.agendar({
      clienteId: "cliente-carlos",
      titulo: "Reunião de teste",
      inicio: "2026-09-01T10:00:00-03:00",
      fim: "2026-09-01T10:30:00-03:00",
      canal: "calendly",
    });

    expect(reuniao.status).toBe("agendada");
    const depois = await container.agenda.listarPorCliente("cliente-carlos");
    expect(depois.length).toBe(antes + 1);
  });

  it("E02-S07 AC-2: atualizar cliente persiste alteração de dados na sessão", async () => {
    await container.clientes.atualizar("cliente-carlos", { telefone: "+55 11 90000-9999" });
    const cliente = await container.clientes.obter("cliente-carlos");
    expect(cliente?.telefone).toBe("+55 11 90000-9999");
  });
});
