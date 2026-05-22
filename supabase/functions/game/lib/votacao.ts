export type ResultadoVotacao = "aguardando" | "rejeitado" | "aprovado";

export function resolverVotacao(
  votos: { aprovado: boolean }[],
  totalElegiveis: number,
): ResultadoVotacao {
  if (votos.length < totalElegiveis) return "aguardando";
  const aprovacoes = votos.filter((v) => v.aprovado).length;
  return aprovacoes > totalElegiveis / 2 ? "aprovado" : "rejeitado";
}

export function validarVoto(
  votosExistentes: { votante_id: string; acusado_id: string }[],
  votanteId: string,
  acusadoId: string,
): void {
  const duplicado = votosExistentes.some(
    (v) => v.votante_id === votanteId && v.acusado_id === acusadoId,
  );
  if (duplicado) throw new Error("Você já votou nesta acusação");
}
