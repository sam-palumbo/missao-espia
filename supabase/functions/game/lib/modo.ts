import type { ModoSala, SalaStatus } from "./types.ts";

interface ValidarTrocaModoInput {
  userId: string;
  sala: { anfitriao: string | null; status: SalaStatus };
  novoModo: ModoSala;
}

const MODOS_VALIDOS: ModoSala[] = ["online", "presencial"];

export function validarTrocaModo(input: ValidarTrocaModoInput): void {
  if (!MODOS_VALIDOS.includes(input.novoModo)) {
    throw new Error(`Modo inválido: ${input.novoModo}`);
  }
  if (input.sala.anfitriao !== input.userId) {
    throw new Error("Apenas o anfitrião pode trocar o modo da sala");
  }
  if (input.sala.status !== "aguardando") {
    throw new Error("Não é possível trocar o modo após iniciar a partida");
  }
}


