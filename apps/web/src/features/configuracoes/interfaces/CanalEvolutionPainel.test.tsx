// E13-S15 — painel do canal Evolution: servidor com versão provada, instância + webhook, QR com
// aceite de risco, polling de conexão, número divergente, mensagem de teste e ativação.
// @vitest-environment jsdom
import i18n from "@/shared/i18n/config";
import { ToastViewport } from "@/shared/ui";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { EvolutionCanalPort } from "../application/ports";
import {
  type CanalEvolution,
  type CompatibilidadeEvolution,
  type DadosEvolution,
  ErroCanalEvolution,
  type ResultadoEstado,
  type ServidorEvolution,
} from "../domain/evolution";
import type { AgenteIAIntegracao } from "../domain/types";
import { CanalEvolutionPainel } from "./CanalEvolutionPainel";

const CONTA = "11111111-1111-4111-8111-111111111111";
const QR_BASE64 = `iVBORw0KGgo${"A".repeat(400)}`;

const SERVIDOR_OK: ServidorEvolution = {
  urlBase: "https://evo.exemplo.com",
  versao: "2.3.7",
  estado: "compativel",
  motivo: null,
  indicio: "idor",
};
const MATRIZ_OK: CompatibilidadeEvolution[] = [
  {
    versao: "2.3.7",
    capacidades: ["instanceCreate", "qr", "connectionState", "webhookHeaders", "webhookEvents"],
    afetadaLogout: false,
    evidencia: "smoke",
  },
];
const canal = (over: Partial<CanalEvolution> = {}): CanalEvolution => ({
  id: CONTA,
  nomeExibicao: "WhatsApp Akros",
  numero: "5511988881001",
  ativa: false,
  estadoConexao: "sem_credencial",
  ultimoErroCodigo: null,
  aceiteRiscoEm: null,
  ...over,
});
const AGENTE: AgenteIAIntegracao = {
  id: "22222222-2222-4222-8222-222222222222",
  nome: "Ana",
  funcao: "triagem",
  alma: "x".repeat(30),
  saudacao: "Olá",
  mensagemHandoff: "Chamo a equipe",
  modelo: "m",
  ativo: false,
};

function criarPorta(inicial: Partial<DadosEvolution> = {}) {
  const dados: DadosEvolution = { servidor: null, compatibilidade: [], canais: [], ...inicial };
  const porta = {
    dados,
    carregar: vi.fn(async () => structuredClone(dados)),
    salvarServidor: vi.fn(async () => ({
      estado: "compativel" as const,
      versao: "2.3.7",
      indicio: "idor",
      afetadaLogout: false,
    })),
    registrarCompatibilidade: vi.fn(async () => ({ compativel: true })),
    criarCanal: vi.fn(async () => ({ contaId: CONTA })),
    criarInstancia: vi.fn(async () => {}),
    instalarWebhook: vi.fn(async () => {}),
    aceitarRisco: vi.fn(async () => {}),
    gerarQr: vi.fn(async () => ({
      qrBase64: QR_BASE64,
      expiraEm: new Date(Date.now() + 60_000).toISOString(),
    })),
    consultarEstado: vi.fn(
      async (): Promise<ResultadoEstado> => ({ estado: "aguardando_pareamento" }),
    ),
    enviarTeste: vi.fn(async () => {}),
    definirAtiva: vi.fn(async () => {}),
    vincularAgente: vi.fn(async () => {}),
  };
  return porta satisfies EvolutionCanalPort & { dados: DadosEvolution };
}

async function abrir(porta: ReturnType<typeof criarPorta>, agentes: AgenteIAIntegracao[] = []) {
  render(
    <>
      <CanalEvolutionPainel agentes={agentes} porta={porta} />
      <ToastViewport />
    </>,
  );
  await screen.findByRole("heading", { name: /servidor evolution/i });
}

beforeAll(async () => {
  await i18n.changeLanguage("pt-BR");
});

describe("CanalEvolutionPainel", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("sem servidor: mostra o vazio, bloqueia 'Adicionar número' e abre o modal de configuração", async () => {
    const porta = criarPorta();
    await abrir(porta);
    expect(screen.getByText(/nenhum servidor configurado/i)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: /adicionar número/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /configurar servidor/i }));
    expect(
      within(screen.getByRole("dialog")).getByLabelText(/endereço \(https\) do servidor/i),
    ).toBeTruthy();
  });

  it("salvar servidor envia URL e chave UMA vez e esvazia o campo; a chave nunca fica no DOM", async () => {
    const porta = criarPorta();
    await abrir(porta);
    fireEvent.click(screen.getByRole("button", { name: /configurar servidor/i }));
    const d = screen.getByRole("dialog");
    fireEvent.change(within(d).getByLabelText(/endereço \(https\) do servidor/i), {
      target: { value: "https://evo.exemplo.com" },
    });
    fireEvent.change(within(d).getByLabelText(/chave de administração/i), {
      target: { value: "CHAVE-SECRETA-12345" },
    });
    fireEvent.submit(d.querySelector("form") as HTMLFormElement);
    await waitFor(() =>
      expect(porta.salvarServidor).toHaveBeenCalledWith(
        "https://evo.exemplo.com",
        "CHAVE-SECRETA-12345",
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.body.innerHTML).not.toContain("CHAVE-SECRETA-12345");
    // reabrir: o campo da chave vem vazio
    fireEvent.click(screen.getByRole("button", { name: /configurar servidor/i }));
    expect(
      (
        within(screen.getByRole("dialog")).getByLabelText(
          /chave de administração/i,
        ) as HTMLInputElement
      ).value,
    ).toBe("");
  });

  it("servidor incompatível mostra o motivo, o comando do smoke e registra a versão provada", async () => {
    const porta = criarPorta({
      servidor: {
        ...SERVIDOR_OK,
        estado: "incompativel",
        motivo: "A versão 2.3.7 ainda não foi provada neste projeto.",
      },
    });
    await abrir(porta);
    expect(screen.getByRole("alert").textContent).toContain("ainda não foi provada");
    expect(screen.getByText(/evolution-contract-smoke/)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: /adicionar número/i }) as HTMLButtonElement).disabled,
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /registrar versão provada/i }));
    const d = screen.getByRole("dialog");
    expect((within(d).getByLabelText("Versão") as HTMLInputElement).value).toBe("2.3.7");
    for (const rotulo of [
      /criar instância/i,
      /gerar qr code/i,
      /consultar estado da conexão/i,
      /webhook com cabeçalho secreto/i,
      /eventos do webhook/i,
    ]) {
      fireEvent.click(within(d).getByLabelText(rotulo));
    }
    fireEvent.change(within(d).getByLabelText("Evidência"), {
      target: { value: "smoke 27/10 por Lucas" },
    });
    fireEvent.submit(d.querySelector("form") as HTMLFormElement);
    await waitFor(() =>
      expect(porta.registrarCompatibilidade).toHaveBeenCalledWith({
        versao: "2.3.7",
        capacidades: ["instanceCreate", "qr", "connectionState", "webhookHeaders", "webhookEvents"],
        afetadaLogout: false,
        evidencia: "smoke 27/10 por Lucas",
      }),
    );
  });

  it("novo número: cria o canal com nome e número", async () => {
    const porta = criarPorta({ servidor: SERVIDOR_OK, compatibilidade: MATRIZ_OK });
    await abrir(porta);
    fireEvent.click(screen.getByRole("button", { name: /adicionar número/i }));
    const d = screen.getByRole("dialog");
    fireEvent.change(within(d).getByLabelText(/número do whatsapp/i), {
      target: { value: "+55 11 98888-1001" },
    });
    fireEvent.submit(d.querySelector("form") as HTMLFormElement);
    await waitFor(() =>
      expect(porta.criarCanal).toHaveBeenCalledWith("WhatsApp Akros", "+55 11 98888-1001"),
    );
  });

  it("canal sem instância: UM clique cria a instância e instala o webhook, nessa ordem", async () => {
    const porta = criarPorta({
      servidor: SERVIDOR_OK,
      compatibilidade: MATRIZ_OK,
      canais: [canal()],
    });
    await abrir(porta);
    fireEvent.click(
      await screen.findByRole("button", { name: /criar instância e instalar webhook/i }),
    );
    await waitFor(() => expect(porta.instalarWebhook).toHaveBeenCalledTimes(1));
    expect(porta.criarInstancia).toHaveBeenCalledTimes(1);
    expect(porta.criarInstancia.mock.invocationCallOrder[0]).toBeLessThan(
      porta.instalarWebhook.mock.invocationCallOrder[0],
    );
  });

  it("configuração incompleta: 'Retomar' só instala o webhook (não recria a instância) e mostra o último erro", async () => {
    const porta = criarPorta({
      servidor: SERVIDOR_OK,
      compatibilidade: MATRIZ_OK,
      canais: [
        canal({
          estadoConexao: "configuracao_incompleta",
          ultimoErroCodigo: "webhook_nao_confirmado",
        }),
      ],
    });
    await abrir(porta);
    expect((await screen.findAllByRole("alert"))[0].textContent).toMatch(/leitura não confere/i);
    fireEvent.click(screen.getByRole("button", { name: /retomar configuração/i }));
    await waitFor(() => expect(porta.instalarWebhook).toHaveBeenCalledTimes(1));
    expect(porta.criarInstancia).not.toHaveBeenCalled();
  });

  it("QR: exige o aceite do risco, registra o aceite, mostra a imagem e nunca a guarda no navegador", async () => {
    const porta = criarPorta({
      servidor: SERVIDOR_OK,
      compatibilidade: MATRIZ_OK,
      canais: [canal({ estadoConexao: "aguardando_pareamento" })],
    });
    await abrir(porta);
    const botao = (await screen.findByRole("button", {
      name: /gerar qr code/i,
    })) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/não é a via oficial do whatsapp/i));
    expect(botao.disabled).toBe(false);
    fireEvent.click(botao);
    const img = (await screen.findByAltText(/qr code para parear/i)) as HTMLImageElement;
    expect(img.src.startsWith("data:image/png;base64,iVBORw0KGgo")).toBe(true);
    expect(porta.aceitarRisco).toHaveBeenCalledTimes(1);
    expect(porta.aceitarRisco.mock.invocationCallOrder[0]).toBeLessThan(
      porta.gerarQr.mock.invocationCallOrder[0],
    );
    expect(JSON.stringify({ ...localStorage })).not.toContain("iVBOR");
    expect(JSON.stringify({ ...sessionStorage })).not.toContain("iVBOR");
  });

  it("com risco já aceito não pede de novo e não registra outra vez", async () => {
    const porta = criarPorta({
      servidor: SERVIDOR_OK,
      compatibilidade: MATRIZ_OK,
      canais: [canal({ estadoConexao: "desconectado", aceiteRiscoEm: "2026-10-27T12:00:00Z" })],
    });
    await abrir(porta);
    expect(screen.queryByLabelText(/não é a via oficial/i)).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: /gerar qr code/i }));
    await screen.findByAltText(/qr code para parear/i);
    expect(porta.aceitarRisco).not.toHaveBeenCalled();
  });

  it("enquanto o QR está aberto a conexão é conferida sozinha e o QR some quando conecta", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const porta = criarPorta({
      servidor: SERVIDOR_OK,
      compatibilidade: MATRIZ_OK,
      canais: [canal({ estadoConexao: "desconectado", aceiteRiscoEm: "2026-10-27" })],
    });
    await abrir(porta);
    fireEvent.click(await screen.findByRole("button", { name: /gerar qr code/i }));
    await screen.findByAltText(/qr code para parear/i);
    porta.consultarEstado.mockResolvedValue({ estado: "conectado_verificado" });
    // o servidor passa a refletir a conexão na próxima leitura
    porta.dados.canais[0] = { ...porta.dados.canais[0], estadoConexao: "conectado_verificado" };
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_100);
    });
    await waitFor(() => expect(screen.queryByAltText(/qr code para parear/i)).toBeNull());
    expect(porta.consultarEstado).toHaveBeenCalledWith(CONTA);
    expect(
      (await within(screen.getByTestId(`canal-${CONTA}`)).findAllByText(/conectado e verificado/i))
        .length,
    ).toBeGreaterThan(0);
  });

  it("número diferente do cadastrado: avisa, derruba o QR e NÃO marca conectado", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const porta = criarPorta({
      servidor: SERVIDOR_OK,
      compatibilidade: MATRIZ_OK,
      canais: [canal({ estadoConexao: "aguardando_pareamento", aceiteRiscoEm: "2026-10-27" })],
    });
    await abrir(porta);
    fireEvent.click(await screen.findByRole("button", { name: /gerar qr code/i }));
    await screen.findByAltText(/qr code para parear/i);
    porta.consultarEstado.mockResolvedValue({
      estado: "aguardando_pareamento",
      numeroDivergente: true,
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_100);
    });
    expect(
      (await screen.findAllByRole("alert")).some((a) =>
        /não é o cadastrado/i.test(a.textContent ?? ""),
      ),
    ).toBe(true);
    expect(screen.queryByAltText(/qr code para parear/i)).toBeNull();
    // (o toast de um teste anterior pode ainda estar no ar: confere só o cartão do canal)
    expect(
      within(screen.getByTestId(`canal-${CONTA}`)).queryByText(/número conectado e verificado/i),
    ).toBeNull();
    expect(
      within(screen.getByTestId(`canal-${CONTA}`)).getByText("Aguardando pareamento"),
    ).toBeTruthy();
  });

  it("QR em formato que não é imagem não é inventado: mostra erro", async () => {
    const porta = criarPorta({
      servidor: SERVIDOR_OK,
      compatibilidade: MATRIZ_OK,
      canais: [canal({ estadoConexao: "desconectado", aceiteRiscoEm: "2026-10-27" })],
    });
    porta.gerarQr.mockResolvedValue({
      qrBase64: "2@codigo-curto-nao-imagem",
      expiraEm: new Date(Date.now() + 60_000).toISOString(),
    });
    await abrir(porta);
    fireEvent.click(await screen.findByRole("button", { name: /gerar qr code/i }));
    expect(
      (await screen.findAllByRole("alert")).some((a) =>
        /não dá para exibir/i.test(a.textContent ?? ""),
      ),
    ).toBe(true);
    expect(screen.queryByAltText(/qr code para parear/i)).toBeNull();
  });

  it("canal conectado: ativar fica bloqueado até provar o envio; a mensagem de teste destrava", async () => {
    const porta = criarPorta({
      servidor: SERVIDOR_OK,
      compatibilidade: MATRIZ_OK,
      canais: [canal({ estadoConexao: "conectado_verificado" })],
    });
    await abrir(porta, [AGENTE]);
    const ativar = (await screen.findByRole("button", {
      name: /^ativar canal$/i,
    })) as HTMLButtonElement;
    expect(ativar.disabled).toBe(true);
    expect(screen.getByText(/envie a mensagem de teste antes de ativar/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/número para a mensagem de teste/i), {
      target: { value: "5521977770001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar mensagem de teste/i }));
    await waitFor(() => expect(porta.enviarTeste).toHaveBeenCalledWith(CONTA, "5521977770001"));

    // depois do envio provado a matriz traz sendText: ativar libera
    porta.dados.compatibilidade = [
      { ...MATRIZ_OK[0], capacidades: [...MATRIZ_OK[0].capacidades, "sendText"] },
    ];
    fireEvent.click(screen.getByRole("button", { name: /atualizar estado/i }));
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: /^ativar canal$/i }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );
    fireEvent.click(screen.getByRole("button", { name: /^ativar canal$/i }));
    await waitFor(() => expect(porta.definirAtiva).toHaveBeenCalledWith(CONTA, true));
  });

  it("vincula o agente que atende o número", async () => {
    const porta = criarPorta({
      servidor: SERVIDOR_OK,
      compatibilidade: MATRIZ_OK,
      canais: [canal({ estadoConexao: "conectado_verificado" })],
    });
    await abrir(porta, [AGENTE]);
    fireEvent.click(await screen.findByRole("button", { name: /vincular agente/i }));
    await waitFor(() => expect(porta.vincularAgente).toHaveBeenCalledWith(CONTA, AGENTE.id));
  });

  it("erro de uma ação aparece traduzido pelo código, sem despejar o texto cru", async () => {
    const porta = criarPorta({
      servidor: SERVIDOR_OK,
      compatibilidade: MATRIZ_OK,
      canais: [canal({ estadoConexao: "aguardando_pareamento" })],
    });
    porta.gerarQr.mockRejectedValue(
      new ErroCanalEvolution("qr_indisponivel", "texto cru do servidor"),
    );
    await abrir(porta);
    fireEvent.click(await screen.findByLabelText(/não é a via oficial/i));
    fireEvent.click(screen.getByRole("button", { name: /gerar qr code/i }));
    expect(await screen.findByText(/não devolveu o qr code/i)).toBeTruthy();
    expect(document.body.textContent).not.toContain("texto cru do servidor");
  });

  it("NUNCA oferece 'reiniciar pareamento'/sair da sessão; em versão afetada explica o que fazer", async () => {
    for (const afetada of [false, true]) {
      const porta = criarPorta({
        servidor: SERVIDOR_OK,
        compatibilidade: [{ ...MATRIZ_OK[0], afetadaLogout: afetada }],
        canais: [
          canal({ estadoConexao: "conectado_verificado" }),
          canal({ id: "33333333-3333-4333-8333-333333333333", estadoConexao: "desconectado" }),
        ],
      });
      await abrir(porta);
      await screen.findAllByText(/atualizar estado/i);
      const textoBotoes = screen
        .getAllByRole("button")
        .map((b) => b.textContent)
        .join(" | ");
      expect(textoBotoes).not.toMatch(/reiniciar|sair da sess|logout|desconectar sess/i);
      expect(!!screen.queryAllByText(/reinicie o servidor evolution/i).length).toBe(afetada);
      cleanup();
    }
  });

  it("nenhum campo de segredo guarda valor depois de qualquer fluxo (chave só em senha e vazia)", async () => {
    const porta = criarPorta({ servidor: SERVIDOR_OK, compatibilidade: MATRIZ_OK });
    await abrir(porta);
    for (const input of Array.from(document.querySelectorAll('input[type="password"]'))) {
      expect((input as HTMLInputElement).value).toBe("");
    }
    expect(document.body.innerHTML).not.toMatch(/apikey|api_key|x-akros-webhook/i);
  });
});
