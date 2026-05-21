import { getDb }            from "../lib/db.ts";
import { verificarSenha }   from "../lib/senha.ts";
import type { EntrarSalaPayload } from "../lib/types.ts";

export async function entrarSala(userId: string, payload: unknown) {
  const { codigo, apelido, senha } = payload as EntrarSalaPayload;

  if (!codigo?.trim())  throw new Error("Código obrigatório");
  if (!apelido?.trim()) throw new Error("Apelido obrigatório");

  const db = getDb();

  // Buscar sala
  const { data: sala, error: salaErr } = await db
    .from("salas")
    .select("*")
    .eq("codigo", codigo.toUpperCase())
    .single();

  if (salaErr || !sala) throw Object.assign(new Error("Sala não encontrada"), { status: 404 });
  if (sala.status === "encerrada") throw Object.assign(new Error("Sala encerrada"), { status: 410 });
  if (sala.status === "jogando")   throw Object.assign(new Error("Partida já em andamento"), { status: 409 });

  // Verificar senha
  if (sala.senha_hash) {
    if (!senha) throw Object.assign(new Error("Senha obrigatória"), { status: 403 });
    const ok = await verificarSenha(senha, sala.senha_hash);
    if (!ok)   throw Object.assign(new Error("Senha incorreta"), { status: 403 });
  }

  // Verificar se jogador já está na sala (reconexão)
  const { data: existente } = await db
    .from("jogadores")
    .select("*")
    .eq("sala_id", sala.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existente) {
    const { data: jogador } = await db
      .from("jogadores")
      .update({ conectado: true })
      .eq("id", existente.id)
      .select()
      .single();
    return { sala, jogador };
  }

  // Inserir novo jogador
  const { data: jogador, error: jogErr } = await db
    .from("jogadores")
    .insert({ sala_id: sala.id, user_id: userId, apelido: apelido.trim() })
    .select()
    .single();

  if (jogErr || !jogador) throw new Error("Falha ao entrar na sala: " + jogErr?.message);

  return { sala, jogador };
}
