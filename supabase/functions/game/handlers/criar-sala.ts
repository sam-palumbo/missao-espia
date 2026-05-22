// supabase/functions/game/handlers/criar-sala.ts
import { getDb }              from "../lib/db.ts";
import { gerarCodigoUnico }   from "../lib/codigo.ts";
import { hashSenha }          from "../lib/senha.ts";
import type { CriarSalaPayload, ModoSala } from "../lib/types.ts";

const MODOS_VALIDOS: ModoSala[] = ["online", "presencial"];

export async function criarSala(userId: string, payload: unknown) {
  const { apelido, num_rodadas, modo, senha } = payload as CriarSalaPayload;

  if (!apelido?.trim())        throw new Error("Apelido obrigatório");
  if (!num_rodadas || num_rodadas < 1) throw new Error("Número de rodadas inválido");
  const modoFinal: ModoSala = modo ?? "online";
  if (!MODOS_VALIDOS.includes(modoFinal)) throw new Error(`Modo inválido: ${modoFinal}`);

  const db = getDb();
  const codigo = await gerarCodigoUnico(db);
  const senha_hash = senha ? await hashSenha(senha) : null;

  const { data: sala, error: salaErr } = await db
    .from("salas")
    .insert({ codigo, anfitriao: userId, num_rodadas, modo: modoFinal, senha_hash })
    .select()
    .single();

  if (salaErr || !sala) throw new Error("Falha ao criar sala: " + salaErr?.message);

  const { data: jogador, error: jogErr } = await db
    .from("jogadores")
    .insert({ sala_id: sala.id, user_id: userId, apelido: apelido.trim() })
    .select()
    .single();

  if (jogErr || !jogador) throw new Error("Falha ao criar jogador: " + jogErr?.message);

  return { sala, jogador };
}
