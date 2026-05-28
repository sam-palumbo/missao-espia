// ============================================================
// Tradução centralizada de erros do Supabase Auth (GoTrue) → PT-BR.
// As páginas só exibem o texto retornado aqui (AC0.1).
// ============================================================

export const ERRO_GENERICO = "Falha de conexão. Tente novamente.";

/**
 * Converte um erro do GoTrue (ou qualquer throw) numa mensagem PT-BR.
 * Casa por `code` quando disponível e cai para correspondência por texto.
 */
export function traduzErroAuth(error: unknown): string {
  if (!error) return ERRO_GENERICO;

  const err = error as { code?: string; message?: string; status?: number };
  const code = (err.code ?? "").toLowerCase();
  const msg = (err.message ?? "").toLowerCase();
  const has = (s: string) => msg.includes(s);

  // E-mail já cadastrado (AC1.5)
  if (code === "email_exists" || code === "user_already_exists" ||
      has("already registered") || has("already been registered") || has("user already exists")) {
    return "E-mail já cadastrado";
  }

  // Credenciais inválidas no login (AC3.2) — mensagem genérica (P3)
  if (code === "invalid_credentials" || has("invalid login credentials")) {
    return "E-mail ou senha inválidos";
  }

  // E-mail não confirmado (AC3.3)
  if (code === "email_not_confirmed" || has("email not confirmed")) {
    return "Confirme seu e-mail para entrar";
  }

  // Senha fraca / curta (AC1.3)
  if (code === "weak_password" || has("password should be at least") || has("password is too short")) {
    return "A senha não atende aos requisitos mínimos";
  }

  // Identidade Google já vinculada a outro usuário (AC7.4)
  if (code === "identity_already_exists" || has("identity is already linked") || has("already linked")) {
    return "Esta conta Google já está vinculada a outro usuário";
  }

  // Excesso de requisições (reenvio/recuperação — max_frequency)
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" ||
      err.status === 429 || has("rate limit") || has("too many requests")) {
    return "Muitas tentativas. Aguarde um momento e tente novamente.";
  }

  // Link expirado/ inválido (AC2.3, AC5.4)
  if (code === "otp_expired" || has("expired") || has("invalid token") || has("token has expired")) {
    return "Link expirado ou inválido. Reinicie o processo.";
  }

  return ERRO_GENERICO;
}
