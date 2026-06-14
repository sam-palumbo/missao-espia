"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Player } from "@/lib/types";

export type { Player } from "@/lib/types";

export function usePlayers(salaId: string | null) {
  const [players, setPlayers] = useState<Player[]>([]);
  // Mesma guarda do useGameState: o poll de 3s traz a mesma lista a maior parte
  // do tempo; só atualizamos o estado quando o payload muda de fato, evitando
  // re-renders desnecessários da grade de jogadores e da árvore do jogo.
  const lastJsonRef = useRef<string | null>(null);

  useEffect(() => {
    if (!salaId) return;
    const supabase = createClient();

    async function fetch() {
      const { data } = await supabase
        .from("jogadores")
        .select("id, apelido, pontuacao, ativo, conectado, user_id, is_bot")
        .eq("sala_id", salaId!)
        .order("id", { ascending: true });
      if (!data) return;
      const json = JSON.stringify(data);
      if (json === lastJsonRef.current) return;
      lastJsonRef.current = json;
      setPlayers(data as Player[]);
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
