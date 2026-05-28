import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// ── Mock configurável do supabase.auth ─────────────────────────
const auth = {
  getSession: vi.fn(),
  signInAnonymously: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  updateUser: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn(),
  linkIdentity: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({ createClient: () => ({ auth }) }));

import { useAuth } from "@/hooks/useAuth";

function comUsuario(is_anonymous: boolean) {
  auth.getSession.mockResolvedValue({
    data: { session: { user: { id: "user-1", is_anonymous } } },
  });
}

async function montar() {
  const hook = renderHook(() => useAuth());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getSession.mockResolvedValue({ data: { session: null } });
  auth.signInAnonymously.mockResolvedValue({ data: { user: { id: "anon", is_anonymous: true } } });
  // Defaults sem erro:
  auth.updateUser.mockResolvedValue({ data: {}, error: null });
  auth.signUp.mockResolvedValue({ data: {}, error: null });
  auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
  auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  auth.resend.mockResolvedValue({ data: {}, error: null });
  auth.linkIdentity.mockResolvedValue({ data: {}, error: null });
  auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null });
  auth.signOut.mockResolvedValue({ error: null });
});

describe("criarConta (AC1.1 + borda)", () => {
  it("usuário anônimo → updateUser (preserva user.id, P1)", async () => {
    comUsuario(true);
    const { result } = await montar();
    await act(async () => {
      await result.current.criarConta("a@b.com", "segredo123");
    });
    expect(auth.updateUser).toHaveBeenCalledWith({ email: "a@b.com", password: "segredo123" });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("usuário não-anônimo → signUp (fallback)", async () => {
    comUsuario(false);
    const { result } = await montar();
    await act(async () => {
      await result.current.criarConta("a@b.com", "segredo123");
    });
    expect(auth.signUp).toHaveBeenCalled();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("erro de e-mail duplicado é traduzido", async () => {
    comUsuario(true);
    auth.updateUser.mockResolvedValue({ data: {}, error: { code: "email_exists" } });
    const { result } = await montar();
    let res: { error?: string } = {};
    await act(async () => {
      res = await result.current.criarConta("a@b.com", "segredo123");
    });
    expect(res.error).toBe("E-mail já cadastrado");
  });
});

// PBT P1 — invariante de preservação de identidade na conversão
describe("P1 — user.id preservado na conversão", () => {
  it("updateUser não troca o id da sessão anônima", async () => {
    for (const id of ["u1", "u2", "abc-123", "xyz"]) {
      vi.clearAllMocks();
      auth.getSession.mockResolvedValue({ data: { session: { user: { id, is_anonymous: true } } } });
      auth.updateUser.mockResolvedValue({ data: {}, error: null });
      const { result } = await montar();
      expect(result.current.user?.id).toBe(id);
      await act(async () => { await result.current.criarConta("a@b.com", "segredo123"); });
      // updateUser preserva a sessão; o id observado permanece o mesmo
      expect(result.current.user?.id).toBe(id);
    }
  });
});

describe("entrar (AC3.1/3.2)", () => {
  it("sucesso chama signInWithPassword", async () => {
    const { result } = await montar();
    await act(async () => { await result.current.entrar("a@b.com", "segredo123"); });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "segredo123" });
  });
  it("credenciais inválidas → mensagem genérica", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code: "invalid_credentials" } });
    const { result } = await montar();
    let res: { error?: string } = {};
    await act(async () => { res = await result.current.entrar("a@b.com", "x"); });
    expect(res.error).toBe("E-mail ou senha inválidos");
  });
});

describe("recuperarSenha (AC4.1/4.2, P3)", () => {
  it("chama resetPasswordForEmail com redirectTo de redefinição", async () => {
    const { result } = await montar();
    await act(async () => { await result.current.recuperarSenha("a@b.com"); });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "a@b.com",
      expect.objectContaining({ redirectTo: expect.stringContaining("/conta/redefinir") }),
    );
  });

  it("P3 — mesmo retorno (sem erro) para e-mail existente e inexistente", async () => {
    const { result } = await montar();
    auth.resetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null }); // existente
    let r1: { error?: string } = { error: "x" };
    await act(async () => { r1 = await result.current.recuperarSenha("existe@b.com"); });
    auth.resetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: { code: "user_not_found" } }); // inexistente
    let r2: { error?: string } = { error: "y" };
    await act(async () => { r2 = await result.current.recuperarSenha("naoexiste@b.com"); });
    expect(r1).toEqual(r2);
    expect(r1.error).toBeUndefined();
  });
});

describe("redefinirSenha (AC5.2)", () => {
  it("chama updateUser com a nova senha", async () => {
    const { result } = await montar();
    await act(async () => { await result.current.redefinirSenha("novaSenha123"); });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "novaSenha123" });
  });
});

describe("entrarComGoogle (AC7.1/7.2)", () => {
  it("anônimo → linkIdentity", async () => {
    comUsuario(true);
    const { result } = await montar();
    await act(async () => { await result.current.entrarComGoogle(); });
    expect(auth.linkIdentity).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }));
    expect(auth.signInWithOAuth).not.toHaveBeenCalled();
  });
  it("não-anônimo → signInWithOAuth", async () => {
    comUsuario(false);
    const { result } = await montar();
    await act(async () => { await result.current.entrarComGoogle(); });
    expect(auth.signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }));
    expect(auth.linkIdentity).not.toHaveBeenCalled();
  });
});

describe("sair (AC6.1)", () => {
  it("chama signOut", async () => {
    const { result } = await montar();
    await act(async () => { await result.current.sair(); });
    expect(auth.signOut).toHaveBeenCalled();
  });
});
