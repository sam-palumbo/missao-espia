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

    async function fetch() {
      const { data } = await supabase
        .from("jogadores")
        .select("id, apelido, pontuacao, ativo, conectado, user_id")
        .eq("sala_id", salaId!);
      if (data) setPlayers(data);
    }

    fetch();

    const channel = supabase
      .channel(`players:${salaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jogadores", filter: `sala_id=eq.${salaId}` },
        () => fetch()
      )
      .subscribe();

    const interval = setInterval(fetch, 3000);

    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [salaId]);

  return players;
}
