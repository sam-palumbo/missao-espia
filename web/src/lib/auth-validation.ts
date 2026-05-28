// ============================================================
// Validação de credenciais — compartilhada entre as telas de auth.
// As mesmas regras são garantidas no servidor pelo Supabase Auth (P5):
// o cliente nunca é a única linha de defesa.
// ============================================================

// Sincronizado com `[auth] minimum_password_length` em supabase/config.toml.
export const MIN_PASSWORD_LENGTH = 6;

// Formato simples e pragmático: algo@algo.dominio, sem espaços.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Retorna `true` se o e-mail tem formato plausível. */
export function validarEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Retorna mensagem de erro PT-BR, ou `null` se a senha é válida. */
export function validarSenha(senha: string): string | null {
  if (!senha) return "Informe uma senha";
  if (senha.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  return null;
}

/** Retorna mensagem de erro PT-BR, ou `null` se as senhas conferem. */
export function validarConfirmacao(senha: string, confirmacao: string): string | null {
  if (senha !== confirmacao) return "As senhas não conferem";
  return null;
}
