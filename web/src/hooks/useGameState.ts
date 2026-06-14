"use client";
import { useEffect, useRef, useState } from "react";
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
  // O poll de 3s e o realtime podem trazer dados idênticos ao estado atual.
  // Sem essa guarda, cada fetch criaria um novo objeto e re-renderizaria toda a
  // árvore do jogo a cada 3s, mesmo sem mudança. Comparamos o payload serializado
  // e só atualizamos quando algo de fato mudou.
  const lastJsonRef = useRef<string | null>(null);

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
      if (!data) return;
      const json = JSON.stringify(data);
      if (json === lastJsonRef.current) return;
      lastJsonRef.current = json;
      setRodada(data as RodadaAtual);
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
