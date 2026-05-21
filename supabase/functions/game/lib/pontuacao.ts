// supabase/functions/game/lib/pontuacao.ts

export interface ResultadoRodada {
  espiaPego: boolean;
  espiaAdivinhou: boolean;
}

export interface PontuacaoRodada {
  pontoEspia: number;
  pontoGrupo: number;
}

export function calcularPontuacao(r: ResultadoRodada): PontuacaoRodada {
  if (!r.espiaPego && r.espiaAdivinhou)  return { pontoEspia: 3, pontoGrupo: 0 };
  if (!r.espiaPego && !r.espiaAdivinhou) return { pontoEspia: 2, pontoGrupo: 0 };
  if (r.espiaPego  && r.espiaAdivinhou)  return { pontoEspia: 1, pontoGrupo: 0 };
  return { pontoEspia: 0, pontoGrupo: 1 };
}
