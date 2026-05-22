"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export type ResultadoVotacaoHistorico = "eliminado" | "sobreviveu" | "espia_pego";

export interface HistoricoPergunta {
  tipo?: "pergunta";
  perguntador_apelido: string;
  destinatario_apelido: string;
  pergunta: string;
  resposta: string;
}

export interface HistoricoVotacao {
  tipo: "votacao";
  acusado_apelido: string;
  votos: { votante_apelido: string; aprovado: boolean }[];
  resultado: ResultadoVotacaoHistorico;
}

export type HistoricoItem = HistoricoPergunta | HistoricoVotacao;

export interface EstadoRodada {
  fase: "jogando" | "aguardando_resposta" | "votacao" | "adivinhacao" | "resultado";
  turno_atual: string;
  ordem_turnos: string[];
  espia_ids: string[];
  timer_end: string;
  eliminacoes_erradas: number;
  acusado_id: string | null;
  acusou_neste_turno: boolean;
  adivinhou_evento_id: number | null;
  pergunta_atual: { perguntador_id: string; perguntador_apelido: string; destinatario_id: string; destinatario_apelido: string; texto: string } | null;
  historico: HistoricoItem[];
  primeira_rodada: boolean;
  palavras_primeira_rodada: { jogador_id: string; apelido: string; palavra: string }[];
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

    const interval = setInterval(fetchRodadaAtual, 3000);

    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [salaId]);

  return rodada;
}
