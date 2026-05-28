import { describe, it, expect } from "vitest";
import { traduzErroAuth, ERRO_GENERICO } from "@/lib/auth-errors";

describe("traduzErroAuth", () => {
  it("e-mail já cadastrado (por code)", () => {
    expect(traduzErroAuth({ code: "email_exists" })).toBe("E-mail já cadastrado");
  });
  it("e-mail já cadastrado (por mensagem)", () => {
    expect(traduzErroAuth({ message: "User already registered" })).toBe("E-mail já cadastrado");
  });
  it("credenciais inválidas → genérico de login (P3)", () => {
    expect(traduzErroAuth({ message: "Invalid login credentials" })).toBe("E-mail ou senha inválidos");
  });
  it("e-mail não confirmado", () => {
    expect(traduzErroAuth({ code: "email_not_confirmed" })).toBe("Confirme seu e-mail para entrar");
  });
  it("senha fraca", () => {
    expect(traduzErroAuth({ message: "Password should be at least 6 characters" }))
      .toBe("A senha não atende aos requisitos mínimos");
  });
  it("identidade Google já vinculada (AC7.4)", () => {
    expect(traduzErroAuth({ message: "Identity is already linked to another user" }))
      .toBe("Esta conta Google já está vinculada a outro usuário");
  });
  it("rate limit por status 429", () => {
    expect(traduzErroAuth({ status: 429 })).toContain("Aguarde");
  });
  it("link expirado", () => {
    expect(traduzErroAuth({ code: "otp_expired" })).toContain("Link expirado");
  });
  it("erro desconhecido → fallback", () => {
    expect(traduzErroAuth({ message: "qualquer coisa estranha" })).toBe(ERRO_GENERICO);
  });
  it("null/undefined → fallback", () => {
    expect(traduzErroAuth(null)).toBe(ERRO_GENERICO);
    expect(traduzErroAuth(undefined)).toBe(ERRO_GENERICO);
  });
});
