import type { SalaStatus, ModoSala } from "./types.ts";

// ============================================================
// Validações Puras para Entrar na Sala
// ============================================================
// Estas funções não têm efeitos colaterais → 100% testáveis
// ============================================================

export interface SalaParaValidacao {
  status: SalaStatus;
  modo?: ModoSala;
}

export function validarCodigo(codigo: unknown): asserts codigo is string {
  if (!codigo || typeof codigo !== "string" || !codigo.trim()) {
    throw new Error("Código obrigatório");
  }
}

export function validarApelido(apelido: unknown): asserts apelido is string {
  if (!apelido || typeof apelido !== "string" || !apelido.trim()) {
    throw new Error("Apelido obrigatório");
  }
}

export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase();
}

export function validarStatusSalaParaEntrada(sala: { status: SalaStatus }): void {
  if (sala.status === "encerrada") {
    throw Object.assign(new Error("Sala encerrada"), { status: 410 });
  }
  if (sala.status === "jogando") {
    throw Object.assign(new Error("Partida já em andamento"), { status: 409 });
  }
}

export function validarSenhaRequerida(
  salaTemSenha: boolean,
  senhaFornecida: unknown
): asserts senhaFornecida is string | undefined {
  if (salaTemSenha && (!senhaFornecida || typeof senhaFornecida !== "string" || !senhaFornecida.trim())) {
    throw Object.assign(new Error("Senha obrigatória"), { status: 403 });
  }
}

export function resultadoValidacaoSenha(ok: boolean): void {
  if (!ok) {
    throw Object.assign(new Error("Senha incorreta"), { status: 403 });
  }
}
