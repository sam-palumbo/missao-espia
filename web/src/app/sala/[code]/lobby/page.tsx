"use client";
import Link from "next/link";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { usePlayers } from "@/hooks/usePlayers";
import { useAuth } from "@/hooks/useAuth";
import { gameActions } from "@/lib/game-actions";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

function PlayerAvatar({ name, isHost }: { name: string; isHost?: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-[var(--gold-bg)] border-2 border-[var(--gold-light)] flex items-center justify-center">
          <span className="font-display text-sm font-bold text-[var(--gold)]">{name.slice(0, 2).toUpperCase()}</span>
        </div>
        {isHost && <span className="absolute -top-1 -right-1 text-[10px]">✦</span>}
      </div>
      <div className="flex-1">
        <p className="font-body font-bold text-[var(--stone)] text-sm">{name}</p>
        {isHost && <p className="text-[10px] text-[var(--gold)] font-display tracking-widest">ANFITRIÃO</p>}
      </div>
      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
    </div>
  );
}

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [salaId, setSalaId] = useState<string | null>(null);
  const [anfitriaoId, setAnfitriaoId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const players = usePlayers(salaId);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("salas").select("id, anfitriao, status").eq("codigo", code).single()
      .then(({ data }) => {
        if (!data) { toast.error("Sala não encontrada"); router.push("/"); return; }
        if (data.status === "jogando") { router.push(`/sala/${code}/jogo`); return; }
        setSalaId(data.id);
        setAnfitriaoId(data.anfitriao);
      });
  }, [code, router]);

  useEffect(() => {
    if (!salaId) return;
    const supabase = createClient();

    // Realtime
    const channel = supabase
      .channel(`sala-status:${salaId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "salas", filter: `id=eq.${salaId}` },
        (payload) => { if (payload.new.status === "jogando") router.push(`/sala/${code}/jogo`); })
      .subscribe();

    // Polling fallback para jogadores que não recebem o evento Realtime
    const interval = setInterval(async () => {
      const { data } = await supabase.from("salas").select("status").eq("id", salaId).single();
      if (data?.status === "jogando") router.push(`/sala/${code}/jogo`);
    }, 3000);

    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [salaId, code, router]);

  const isHost = user?.id === anfitriaoId;

  async function handleIniciar() {
    if (!salaId) return;
    setStarting(true);
    try {
      await gameActions.iniciarRodada(salaId);
      router.push(`/sala/${code}/jogo`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar");
      setStarting(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="relative min-h-dvh flex flex-col px-5 pt-10 pb-10 max-w-sm mx-auto gap-6">
      <header className="flex items-center justify-between animate-fade-up">
        <div>
          <p className="font-display text-[10px] tracking-[0.3em] text-[var(--muted)] uppercase">Sala de Espera</p>
          <h2 className="font-display text-xl font-bold text-[var(--stone)]">Missão Espia</h2>
        </div>
        <Link href="/" className="text-xs text-[var(--muted)] font-display tracking-wider hover:text-[var(--stone)] transition-colors">Sair</Link>
      </header>

      <div className="card p-5 flex flex-col items-center gap-3 animate-fade-up delay-100 animate-pulse-gold">
        <p className="font-display text-[10px] tracking-[0.35em] text-[var(--muted)] uppercase">Compartilhe o Código</p>
        <div className="room-code">{code}</div>
        <button onClick={copyCode} className="text-xs font-display tracking-widest text-[var(--gold)] hover:text-[var(--gold-light)] transition-colors">
          {copied ? "✓ Copiado!" : "Toque para copiar"}
        </button>
      </div>

      <div className="card p-5 flex flex-col gap-1 animate-fade-up delay-200 flex-1">
        <div className="flex items-center justify-between mb-2">
          <p className="font-display text-[10px] tracking-widest text-[var(--muted)] uppercase">Jogadores</p>
          <span className="text-xs font-body text-[var(--muted)]">{players.length} / 12</span>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {players.map(p => (
            <PlayerAvatar key={p.id} name={p.apelido} isHost={p.user_id === anfitriaoId} />
          ))}
        </div>
        {players.length < 4 && (
          <p className="text-xs text-[var(--muted)] font-light italic text-center mt-3">
            Aguardando mínimo de 4 jogadores...
          </p>
        )}
      </div>

      <div className="animate-fade-up delay-400">
        {isHost ? (
          <Button variant="primary" size="lg" className="w-full font-display tracking-widest text-sm"
            disabled={players.length < 4 || starting} onClick={handleIniciar}>
            {starting ? "Iniciando..." : "Iniciar Partida ✦"}
          </Button>
        ) : (
          <p className="text-center text-sm text-[var(--muted)] font-display tracking-wider">
            Aguardando o anfitrião iniciar...
          </p>
        )}
      </div>
    </main>
  );
}
