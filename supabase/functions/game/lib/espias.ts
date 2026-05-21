// supabase/functions/game/lib/espias.ts

export function numEspias(numJogadores: number): number {
  if (numJogadores <= 6) return 1;
  if (numJogadores <= 9) return 2;
  return 3;
}

export function limiteEliminacoesErradas(
  numJogadores: number,
  _numEspias: number
): number {
  if (numJogadores === 4) return 0;
  return _numEspias;
}
