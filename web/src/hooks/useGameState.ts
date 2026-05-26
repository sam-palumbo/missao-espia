"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { RodadaAtual } from "@/lib/types";

export type { RodadaAtual } from "@/lib/types";
export type {
  FaseJogo, ModoSala,
  HistoricoPergunta, HistoricoVotacao, HistoricoTurnoPresencial, HistoricoItem,
  EstadoRodada, PerguntaAtual, PalavraTurno,
  ResultadoVotacaoHistorico,
} from "@/lib/types";

export function useGameState(salaId: string | null) {
  const [rodada, setRodada] = useState<RodadaAtual | null>(null);

  useEffect(() => {
    if (!salaId) return;
    const supabase = createClient();

    async function fetchRodadaAtual() {
      const { data } = await supabase
        .from("rodadas")
        .select("id, numero, evento_id, estado, encerrada_em")
        .eq("sala_id", salaId!)
        .order("numero", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setRodada(data as RodadaAtual);
    }

    fetchRodadaAtual();

    const channel = supabase
      .channel(`rodada:${salaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rodadas", filter: `sala_id=eq.${salaId}` },
        () => { fetchRodadaAtual(); }
      )
      .subscribe();

    const interval = setInterval(fetchRodadaAtual, 3000);

    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [salaId]);

  return rodada;
}
