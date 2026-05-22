import { createClient } from "./supabase";

async function callGame<T>(action: string, payload: unknown): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sessão não encontrada");

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/game`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({ action, payload }),
  });

  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json as T;
}

export interface SalaComJogador {
  sala: { id: string; codigo: string; num_rodadas: number; status: string };
  jogador: { id: string; apelido: string };
}

export const gameActions = {
  criarSala: (apelido: string, num_rodadas: number, opts?: { modo?: "online" | "presencial"; senha?: string }) =>
    callGame<SalaComJogador>("criar_sala", { apelido, num_rodadas, modo: opts?.modo, senha: opts?.senha }),

  entrarSala: (codigo: string, apelido: string, senha?: string) =>
    callGame<SalaComJogador>("entrar_sala", { codigo, apelido, senha }),

  definirModo: (sala_id: string, modo: "online" | "presencial") =>
    callGame<{ ok: true; modo: "online" | "presencial" }>("definir_modo", { sala_id, modo }),

  iniciarRodada: (sala_id: string) =>
    callGame("iniciar_rodada", { sala_id }),

  proximoTurno: (rodada_id: string) =>
    callGame("proximo_turno", { rodada_id }),

  dizerPalavra: (rodada_id: string, palavra: string) =>
    callGame("dizer_palavra", { rodada_id, palavra }),

  fazerPergunta: (rodada_id: string, destinatario_id: string, texto: string) =>
    callGame("fazer_pergunta", { rodada_id, destinatario_id, texto }),

  responderPergunta: (rodada_id: string, resposta: string) =>
    callGame("responder_pergunta", { rodada_id, resposta }),

  acusar: (rodada_id: string, acusado_id: string) =>
    callGame("acusar", { rodada_id, acusado_id }),

  votar: (rodada_id: string, aprovado: boolean) =>
    callGame("votar", { rodada_id, aprovado }),

  adivinhar: (rodada_id: string, evento_id: number) =>
    callGame("adivinhar", { rodada_id, evento_id }),
};
