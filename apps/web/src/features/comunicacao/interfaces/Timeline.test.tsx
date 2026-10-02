// E13-S13 — o agente passa a gravar evento de Instagram na timeline do cliente; um canal sem ícone
// derrubaria a visão 360 inteira (elemento React indefinido).
// @vitest-environment jsdom
import "@/shared/i18n/config";
import type { CanalEvento, EventoComunicacao } from "@/features/comunicacao/domain/types";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Timeline } from "./Timeline";

const CANAIS: CanalEvento[] = [
  "whatsapp",
  "instagram",
  "email",
  "chat_portal",
  "reuniao",
  "sistema",
];

function evento(canal: CanalEvento): EventoComunicacao {
  return {
    id: `e-${canal}`,
    clienteOuLeadId: "c1",
    canal,
    direcao: "entrada",
    autor: "Maria",
    conteudo: `mensagem por ${canal}`,
    ocorridoEm: "2026-10-01T12:00:00Z",
  };
}

describe("Timeline — canais (E13-S13)", () => {
  afterEach(() => cleanup());

  it("renderiza todos os canais, inclusive Instagram, com rótulo textual", () => {
    render(<Timeline eventos={CANAIS.map(evento)} emptyLabel="vazio" />);
    for (const canal of CANAIS) expect(screen.getByText(`mensagem por ${canal}`)).toBeTruthy();
    expect(screen.getByText("Instagram")).toBeTruthy();
  });
});
