"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { ModoSala } from "@/lib/types";

export interface Sala {
  id: string;
  anfitriao: string | null;
  status: string;
  num_rodadas: number;
  modo: ModoSala;
  max_jogadores: number;
  testamentos: string[];
}

// Busca única da sala pelo código, compartilhada pelas páginas de /sala/[code].
// notFound=true quando o código não existe (cada página decide como reagir).
export function useSala(code: string) {
  const [sala, setSala] = useState<Sala | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("salas")
      .select("id, anfitriao, status, num_rodadas, modo, max_jogadores, testamentos")
      .eq("codigo", code)
      .single()
      .then(({ data }) => {
        if (!data) { setNotFound(true); return; }
        setSala({
          id: data.id,
          anfitriao: data.anfitriao ?? null,
          status: data.status,
          num_rodadas: data.num_rodadas,
          modo: data.modo ?? "online",
          max_jogadores: data.max_jogadores ?? 12,
          testamentos: data.testamentos ?? ["AT", "NT"],
        });
      });
  }, [code]);

  return { sala, notFound };
}
