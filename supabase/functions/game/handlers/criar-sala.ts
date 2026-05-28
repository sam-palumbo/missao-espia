import { getDb }              from "../lib/db.ts";
import { gerarCodigoUnico }   from "../lib/codigo.ts";
import { hashSenha }          from "../lib/senha.ts";
import { isModoValido, normalizarModo } from "../lib/modo.ts";
import type { CriarSalaPayload } from "../lib/types.ts";

export async function criarSala(userId: string, payload: unknown) {
  const { apelido, num_rodadas, modo, senha, testamentos, max_jogadores, duracao_minutos } = payload as CriarSalaPayload;

  if (!apelido?.trim())        throw new Error("Apelido obrigatório");
  if (!num_rodadas || num_rodadas < 1 || num_rodadas > 7) throw new Error("Número de rodadas deve ser entre 1 e 7");
  const maxJog = max_jogadores ?? 12;
  if (maxJog < 4 || maxJog > 12) throw new Error("max_jogadores deve ser entre 4 e 12");
  if (duracao_minutos !== undefined && (duracao_minutos < 3 || duracao_minutos > 20)) throw new Error("duracao_minutos deve ser entre 3 e 20");
  const modoFinal = normalizarModo(modo);
  if (modo !== undefined && !isModoValido(modo)) throw new Error(`Modo inválido: ${modo}`);

  // Valida e normaliza testamentos — default: ambos
  const testamentosFinal: string[] =
    Array.isArray(testamentos) && testamentos.length > 0
      ? testamentos.filter((t) => t === "AT" || t === "NT")
      : ["AT", "NT"];
  if (testamentosFinal.length === 0) throw new Error("Selecione ao menos um testamento");

  const db = getDb();
  const codigo = await gerarCodigoUnico(db);
  const senha_hash = senha ? await hashSenha(senha) : null;

  const { data: sala, error: salaErr } = await db
    .from("salas")
    .insert({ codigo, anfitriao: userId, num_rodadas, modo: modoFinal, senha_hash, testamentos: testamentosFinal, max_jogadores: maxJog, duracao_minutos: duracao_minutos ?? null })
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
