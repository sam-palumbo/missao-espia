"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Player } from "@/lib/types";

export { Player } from "@/lib/types";

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
      if (data) setPlayers(data as Player[]);
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
