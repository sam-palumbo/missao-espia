import React from "react";
import { render, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const replace = vi.fn();
let sessionInicial: unknown = null;

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: () => Promise.resolve({ data: { session: sessionInicial }, error: null }),
    },
  }),
}));
vi.mock("@/components/ui/design", async () => (await import("./helpers")).designMock);

import AuthCallbackPage from "@/app/auth/callback/page";

beforeEach(() => {
  vi.clearAllMocks();
  sessionInicial = null;
  window.location.hash = "";
});

describe("Auth callback", () => {
  it("com sessão estabelecida, redireciona para /entrar (AC7.3)", async () => {
    sessionInicial = { user: { id: "u1" } };
    render(<AuthCallbackPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/entrar"));
  });

  it("com erro do provedor na URL, volta ao início sem travar (AC7.5)", async () => {
    window.location.hash = "#error=access_denied&error_description=cancelado";
    render(<AuthCallbackPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });
});
