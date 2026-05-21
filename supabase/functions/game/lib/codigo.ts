// supabase/functions/game/lib/codigo.ts
import { SupabaseClient } from "@supabase/supabase-js";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function gerar(): string {
  return Array.from(
    { length: 4 },
    () => CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join("");
}

export async function gerarCodigoUnico(db: SupabaseClient): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const codigo = gerar();
    const { data } = await db
      .from("salas")
      .select("id")
      .eq("codigo", codigo)
      .eq("status", "aguardando")
      .maybeSingle();
    if (!data) return codigo;
  }
  throw new Error("Não foi possível gerar código único após 20 tentativas");
}
