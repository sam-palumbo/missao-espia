"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export interface Player {
  id: string;
  apelido: string;
  pontuacao: number;
  ativo: boolean;
  conectado: boolean;
  user_id: string | null;
}

export function usePlayers(salaId: string | null) {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!salaId) return;
    const supabase = createClient();

    supabase
      .from("jogadores")
      .select("id, apelido, pontuacao, ativo, conectado, user_id")
      .eq("sala_id", salaId)
      .then(({ data }) => { if (data) setPlayers(data); });

    const channel = supabase
      .channel(`players:${salaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jogadores", filter: `sala_id=eq.${salaId}` },
        () => {
          supabase
            .from("jogadores")
            .select("id, apelido, pontuacao, ativo, conectado, user_id")
            .eq("sala_id", salaId)
            .then(({ data }) => { if (data) setPlayers(data); });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [salaId]);

  return players;
}
