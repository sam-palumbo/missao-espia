import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const replace = vi.fn();
const exchangeCodeForSession = vi.fn();
const signInWithOAuth = vi.fn();
let sessionInicial: unknown = null;

const routerMock = { replace };
vi.mock("next/navigation", () => ({ useRouter: () => routerMock }));
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: () => Promise.resolve({ data: { session: sessionInicial }, error: null }),
      exchangeCodeForSession,
      signInWithOAuth,
    },
  }),
}));
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);

import AuthCallbackPage from "@/app/auth/callback/page";

function setUrl(pathComQuery: string) {
  window.history.replaceState({}, "", pathComQuery);
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionInicial = null;
  exchangeCodeForSession.mockResolvedValue({ error: null });
  signInWithOAuth.mockResolvedValue({ error: null });
  sessionStorage.clear();
  setUrl("/auth/callback");
});

describe("Auth callback", () => {
  it("com ?code=, troca por sessão e redireciona para /entrar (AC7.3)", async () => {
    setUrl("/auth/callback?code=abc123");
    render(<AuthCallbackPage />);
    await waitFor(() => expect(exchangeCodeForSession).toHaveBeenCalledWith("abc123"));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/entrar"));
  });

  it("erro ao trocar o code exibe mensagem e não redireciona", async () => {
    setUrl("/auth/callback?code=ruim");
    exchangeCodeForSession.mockResolvedValue({ error: { message: "bad code" } });
    render(<AuthCallbackPage />);
    await waitFor(() => expect(exchangeCodeForSession).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });

  it("sem code, com sessão estabelecida, redireciona para /entrar", async () => {
    sessionInicial = { user: { id: "u1" } };
    render(<AuthCallbackPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/entrar"));
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("cancelamento do provedor (access_denied) volta ao início sem travar (AC7.5)", async () => {
    setUrl("/auth/callback#error=access_denied&error_description=cancelado");
    render(<AuthCallbackPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("outros erros do provedor são exibidos (não redireciona)", async () => {
    setUrl("/auth/callback#error=server_error&error_description=Algo+deu+errado");
    render(<AuthCallbackPage />);
    await screen.findByText(/Algo deu errado/i);
    expect(replace).not.toHaveBeenCalled();
  });

  it("'identity already linked' refaz como signInWithOAuth para entrar (AC7.4)", async () => {
    setUrl("/auth/callback?error=server_error&error_description=Identity+is+already+linked+to+another+user");
    render(<AuthCallbackPage />);
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google" }),
    ));
    expect(replace).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("google-signin-retry")).toBe("1");
  });

  it("não entra em laço: se o re-login também falha como 'already linked', exibe mensagem", async () => {
    sessionStorage.setItem("google-signin-retry", "1");
    setUrl("/auth/callback?error_description=identity+is+already+linked");
    render(<AuthCallbackPage />);
    await screen.findByText(/já está vinculada a outro usuário/i);
    expect(signInWithOAuth).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("google-signin-retry")).toBeNull();
  });
});
