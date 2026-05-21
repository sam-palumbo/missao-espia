// supabase/functions/game/lib/senha.ts
import * as bcrypt from "bcrypt";

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha);
}

export async function verificarSenha(
  senha: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}
