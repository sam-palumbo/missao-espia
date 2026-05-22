import { getDb }              from "../lib/db.ts";
import { validarTrocaModo }   from "../lib/modo.ts";
import type { DefinirModoPayload } from "../lib/types.ts";

export async function definirModo(userId: string, payload: unknown) {
  const { sala_id, modo } = payload as DefinirModoPayload;
  if (!sala_id) throw new Error("sala_id obrigatório");

  const db = getDb();

  const { data: sala } = await db
    .from("salas")
    .select("anfitriao, status")
    .eq("id", sala_id)
    .single();

  if (!sala) throw Object.assign(new Error("Sala não encontrada"), { status: 404 });

  validarTrocaModo({ userId, sala, novoModo: modo });

  const { error } = await db.from("salas").update({ modo }).eq("id", sala_id);
  if (error) throw new Error("Falha ao atualizar modo: " + error.message);

  return { ok: true, modo };
}
