"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export interface EstadoRodada {
  fase: "jogando" | "votacao" | "adivinhacao" | "resultado";
  turno_atual: string;
  ordem_turnos: string[];
  espia_ids: string[];
  timer_end: string;
  eliminacoes_erradas: number;
  acusado_id: string | null;
  adivinhou_evento_id: number | null;
}

export interface RodadaAtual {
  id: string;
  numero: number;
  evento_id: number;
  estado: EstadoRodada;
  encerrada_em: string | null;
}

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
      if (data) setRodada(data);
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

    return () => { supabase.removeChannel(channel); };
  }, [salaId]);

  return rodada;
}
