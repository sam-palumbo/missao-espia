import type { ModoSala, SalaStatus } from "./types.ts";

export const MODOS_VALIDOS: readonly ModoSala[] = ["online", "presencial"] as const;

export function isModoValido(modo: unknown): modo is ModoSala {
  return MODOS_VALIDOS.includes(modo as ModoSala);
}

interface ValidarTrocaModoInput {
  userId: string;
  sala: { anfitriao: string | null; status: SalaStatus };
  novoModo: ModoSala;
}

export function validarTrocaModo(input: ValidarTrocaModoInput): void {
  if (!isModoValido(input.novoModo)) {
    throw new Error(`Modo inválido: ${input.novoModo}`);
  }
  if (input.sala.anfitriao !== input.userId) {
    throw new Error("Apenas o anfitrião pode trocar o modo da sala");
  }
  if (input.sala.status !== "aguardando") {
    throw new Error("Não é possível trocar o modo após iniciar a partida");
  }
}

export function normalizarModo(modo: unknown | undefined): ModoSala {
  return isModoValido(modo) ? modo : "online";
}


