// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { StrictMode, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sessao } from "../domain/types";
import { sessaoService } from "../infrastructure/EdgeFunctionSessaoService";
import { aplicarSessaoReidratada, useBootstrapSessao } from "./hooks";
import { useSessaoStore } from "./store";

vi.mock("@/shared/lib/env", () => ({ isDemoMode: false }));

const SESSAO: Sessao = {
  accessToken: "token-de-teste",
  expiresAt: 1_800_000_000,
  usuario: {
    id: "11111111-1111-1111-1111-111111111111",
    email: "teste@akros.com",
    papel: "cliente",
  },
};

describe("bootstrap de sessão", () => {
  beforeEach(() => {
    useSessaoStore.setState({ sessao: null, carregando: true });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("E13-S11: refresh atrasado sem cookie não apaga login recém-criado", () => {
    useSessaoStore.getState().definirSessao(SESSAO);
    aplicarSessaoReidratada(null);
    expect(useSessaoStore.getState().sessao).toEqual(SESSAO);
  });

  it("aplica sessão válida quando o bootstrap ainda não tem sessão", () => {
    aplicarSessaoReidratada(SESSAO);
    expect(useSessaoStore.getState().sessao).toEqual(SESSAO);
  });

  it("E13-S11: StrictMode não duplica refresh no mesmo bootstrap", async () => {
    const refresh = vi.spyOn(sessaoService, "refresh").mockResolvedValue(SESSAO);
    function Raiz() {
      useBootstrapSessao();
      return null;
    }

    render(createElement(StrictMode, null, createElement(Raiz)));

    await waitFor(() => expect(useSessaoStore.getState().sessao).toEqual(SESSAO));
    expect(refresh).toHaveBeenCalledOnce();
  });
});
