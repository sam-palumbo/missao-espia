import { assertEquals, assertThrows } from "std/assert";
import {
  validarCodigo,
  validarApelido,
  normalizarCodigo,
  validarStatusSalaParaEntrada,
  validarSenhaRequerida,
  resultadoValidacaoSenha,
} from "./entrar-sala.ts";

// ============================================================
// validarCodigo
// ============================================================

Deno.test("validarCodigo: aceita código com letras", () => {
  validarCodigo("ABCD"); // não deve lançar
});

Deno.test("validarCodigo: aceita código minúsculo (normalizado depois)", () => {
  validarCodigo("abcd"); // não deve lançar
});

Deno.test("validarCodigo: rejeita undefined", () => {
  assertThrows(
    () => validarCodigo(undefined),
    Error,
    "Código obrigatório",
  );
});

Deno.test("validarCodigo: rejeita null", () => {
  assertThrows(
    () => validarCodigo(null),
    Error,
    "Código obrigatório",
  );
});

Deno.test("validarCodigo: rejeita string vazia", () => {
  assertThrows(
    () => validarCodigo(""),
    Error,
    "Código obrigatório",
  );
});

Deno.test("validarCodigo: rejeita só espaços", () => {
  assertThrows(
    () => validarCodigo("   "),
    Error,
    "Código obrigatório",
  );
});

// ============================================================
// validarApelido
// ============================================================

Deno.test("validarApelido: aceita apelido válido", () => {
  validarApelido("João"); // não deve lançar
});

Deno.test("validarApelido: rejeita undefined", () => {
  assertThrows(
    () => validarApelido(undefined),
    Error,
    "Apelido obrigatório",
  );
});

Deno.test("validarApelido: rejeita string vazia", () => {
  assertThrows(
    () => validarApelido(""),
    Error,
    "Apelido obrigatório",
  );
});

Deno.test("validarApelido: rejeita null", () => {
  assertThrows(
    () => validarApelido(null),
    Error,
    "Apelido obrigatório",
  );
});

// ============================================================
// normalizarCodigo
// ============================================================

Deno.test("normalizarCodigo: trim e uppercase", () => {
  assertEquals(normalizarCodigo("  abcd  "), "ABCD");
});

Deno.test("normalizarCodigo: já maiúsculo permanece", () => {
  assertEquals(normalizarCodigo("WXYZ"), "WXYZ");
});

Deno.test("normalizarCodigo: misturado fica maiúsculo", () => {
  assertEquals(normalizarCodigo("aBcD"), "ABCD");
});

// ============================================================
// validarStatusSalaParaEntrada
// ============================================================

Deno.test("validarStatus: permite entrar em sala 'aguardando'", () => {
  validarStatusSalaParaEntrada({ status: "aguardando" }); // não deve lançar
});

Deno.test("validarStatus: bloqueia sala 'encerrada' com status 410", () => {
  let erroCapturado: Error & { status?: number } | null = null;
  try {
    validarStatusSalaParaEntrada({ status: "encerrada" });
  } catch (err) {
    erroCapturado = err as Error & { status?: number };
  }
  assertEquals(erroCapturado?.message, "Sala encerrada");
  assertEquals(erroCapturado?.status, 410);
});

Deno.test("validarStatus: bloqueia sala 'jogando' com status 409", () => {
  let erroCapturado: Error & { status?: number } | null = null;
  try {
    validarStatusSalaParaEntrada({ status: "jogando" });
  } catch (err) {
    erroCapturado = err as Error & { status?: number };
  }
  assertEquals(erroCapturado?.message, "Partida já em andamento");
  assertEquals(erroCapturado?.status, 409);
});

// ============================================================
// validarSenhaRequerida
// ============================================================

Deno.test("senha: sala SEM senha → não requer senha mesmo que não forneça", () => {
  validarSenhaRequerida(false, undefined); // não deve lançar
  validarSenhaRequerida(false, null);      // não deve lançar
  validarSenhaRequerida(false, "");        // não deve lançar
});

Deno.test("senha: sala COM senha → aceita quando fornece senha", () => {
  validarSenhaRequerida(true, "minha-senha-123"); // não deve lançar
});

Deno.test("senha: sala COM senha → bloqueia quando não fornece (undefined)", () => {
  let erroCapturado: Error & { status?: number } | null = null;
  try {
    validarSenhaRequerida(true, undefined);
  } catch (err) {
    erroCapturado = err as Error & { status?: number };
  }
  assertEquals(erroCapturado?.message, "Senha obrigatória");
  assertEquals(erroCapturado?.status, 403);
});

Deno.test("senha: sala COM senha → bloqueia quando senha é vazia", () => {
  let erroCapturado: Error & { status?: number } | null = null;
  try {
    validarSenhaRequerida(true, "");
  } catch (err) {
    erroCapturado = err as Error & { status?: number };
  }
  assertEquals(erroCapturado?.message, "Senha obrigatória");
  assertEquals(erroCapturado?.status, 403);
});

Deno.test("senha: sala COM senha → bloqueia quando senha é só espaços", () => {
  let erroCapturado: Error & { status?: number } | null = null;
  try {
    validarSenhaRequerida(true, "   ");
  } catch (err) {
    erroCapturado = err as Error & { status?: number };
  }
  assertEquals(erroCapturado?.message, "Senha obrigatória");
  assertEquals(erroCapturado?.status, 403);
});

// ============================================================
// resultadoValidacaoSenha
// ============================================================

Deno.test("resultado senha: ok = true → passa", () => {
  resultadoValidacaoSenha(true); // não deve lançar
});

Deno.test("resultado senha: ok = false → status 403", () => {
  let erroCapturado: Error & { status?: number } | null = null;
  try {
    resultadoValidacaoSenha(false);
  } catch (err) {
    erroCapturado = err as Error & { status?: number };
  }
  assertEquals(erroCapturado?.message, "Senha incorreta");
  assertEquals(erroCapturado?.status, 403);
});
