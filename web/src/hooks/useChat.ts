"use client";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

export interface Mensagem {
  id: string;
  jogador_id: string;
  apelido: string;
  texto: string;
  criada_em: string;
}

export function useChat(salaId: string | null) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);

  useEffect(() => {
    if (!salaId) return;
    const supabase = createClient();

    supabase
      .from("mensagens")
      .select("id, jogador_id, apelido, texto, criada_em")
      .eq("sala_id", salaId)
      .order("criada_em", { ascending: true })
      .limit(100)
      .then(({ data }) => { if (data) setMensagens(data); });

    const channel = supabase
      .channel(`chat:${salaId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens", filter: `sala_id=eq.${salaId}` },
        (payload) => {
          setMensagens(prev => [...prev, payload.new as Mensagem]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [salaId]);

  const enviar = useCallback(async (salaId: string, jogadorId: string, apelido: string, texto: string) => {
    const supabase = createClient();
    await supabase.from("mensagens").insert({ sala_id: salaId, jogador_id: jogadorId, apelido, texto });
  }, []);

  return { mensagens, enviar };
}
