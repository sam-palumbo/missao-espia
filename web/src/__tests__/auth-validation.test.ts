import { describe, it, expect } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  validarEmail,
  validarSenha,
  validarConfirmacao,
} from "@/lib/auth-validation";

describe("validarEmail", () => {
  const validos = ["a@b.co", "joao@exemplo.com", "maria.silva@dominio.com.br"];
  const invalidos = ["", "  ", "semarroba", "a@b", "a@.com", "@b.com", "a b@c.com", "a@b .com"];

  it.each(validos)("aceita %s", (e) => {
    expect(validarEmail(e)).toBe(true);
  });
  it.each(invalidos)("rejeita %s", (e) => {
    expect(validarEmail(e)).toBe(false);
  });

  it("ignora espaços nas bordas", () => {
    expect(validarEmail("  joao@exemplo.com  ")).toBe(true);
  });
});

describe("validarSenha (P4 — política de senha)", () => {
  it("rejeita senha vazia", () => {
    expect(validarSenha("")).toBeTypeOf("string");
  });

  // PBT loop-based: ∀ senha length < MIN → erro; ∀ length >= MIN → null
  it("rejeita toda senha menor que o mínimo e aceita as demais", () => {
    for (let len = 1; len <= MIN_PASSWORD_LENGTH + 6; len++) {
      const senha = "a".repeat(len);
      const res = validarSenha(senha);
      if (len < MIN_PASSWORD_LENGTH) {
        expect(res, `len=${len} deveria falhar`).toBeTypeOf("string");
      } else {
        expect(res, `len=${len} deveria passar`).toBeNull();
      }
    }
  });

  it("menciona o mínimo na mensagem", () => {
    expect(validarSenha("ab")).toContain(String(MIN_PASSWORD_LENGTH));
  });
});

describe("validarConfirmacao", () => {
  it("aceita senhas iguais", () => {
    expect(validarConfirmacao("segredo123", "segredo123")).toBeNull();
  });
  it("rejeita senhas diferentes", () => {
    expect(validarConfirmacao("segredo123", "segredo124")).toBeTypeOf("string");
  });
});
