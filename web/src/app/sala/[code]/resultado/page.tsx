"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { EVENTOS } from "@/lib/eventos";
import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { createClient } from "@/lib/supabase";

export default function ResultadoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [salaId, setSalaId] = useState<string | null>(null);
  const [salaEncerrada, setSalaEncerrada] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const rodada = useGameState(salaId);
  const players = usePlayers(salaId);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("salas").select("id, status").eq("codigo", code).single()
      .then(({ data }) => {
        if (data) {
          setSalaId(data.id);
          setSalaEncerrada(data.status === "encerrada");
        }
      });
  }, [code]);

  const evento = EVENTOS.find(e => e.id === rodada?.evento_id);
  const espiaIds = rodada?.estado.espia_ids ?? [];
  const espias = players.filter(p => espiaIds.includes(p.id));
  const espiaPego = espias.some(p => !p.ativo);
  const espiaAdivinhou = (rodada?.estado.adivinhou_evento_id ?? null) !== null;
  const groupWon = espiaPego && !espiaAdivinhou;

  if (!rodada || players.length === 0) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[var(--parchment)]">
        <p className="font-display text-xs tracking-widest text-[var(--muted)] uppercase animate-pulse">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh flex flex-col px-5 pt-10 pb-10 max-w-sm mx-auto gap-6 overflow-hidden">

      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${groupWon ? "var(--gold-light)" : "var(--crimson)"} 0%, transparent 70%)` }} />
      </div>

      <header className="relative z-10 text-center animate-fade-up">
        <p className="font-display text-[10px] tracking-[0.35em] text-[var(--muted)] uppercase mb-3">Resultado da Rodada</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-display tracking-widest mb-3"
          style={{
            borderColor: groupWon ? "var(--gold-light)" : "var(--crimson)",
            color: groupWon ? "var(--gold)" : "var(--crimson)",
            background: groupWon ? "var(--gold-bg)" : "var(--crimson-bg)",
          }}>
          {groupWon ? "✦ Grupo Venceu" : "Espia Venceu"}
        </div>
        <h2 className="font-display text-3xl font-black text-[var(--stone)] leading-tight">
          {groupWon ? "Espia\nDesmascarado" : "Missão\nCumprida"}
        </h2>
      </header>

      <button
        className="relative z-10 card p-5 text-center flex flex-col items-center gap-3 w-full animate-fade-up delay-100 active:scale-[0.98] transition-transform"
        onClick={() => setRevealed(true)}>
        {revealed && evento ? (
          <>
            <p className="font-display text-[10px] tracking-[0.3em] text-[var(--gold)] uppercase">
              {evento.testament === "AT" ? "Antigo Testamento" : "Novo Testamento"}
            </p>
            <p className="font-display text-xl font-bold text-[var(--stone)]">{evento.evento}</p>
            <p className="text-sm text-[var(--muted)] font-light">{evento.local}</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-[var(--gold-bg)] flex items-center justify-center">
              <span className="text-xl">✦</span>
            </div>
            <p className="font-display text-sm font-bold text-[var(--stone)]">Revelar Evento da Rodada</p>
            <p className="text-xs text-[var(--muted)] font-display tracking-wider">Toque para revelar</p>
          </>
        )}
      </button>

      <div className="relative z-10 card p-5 flex flex-col gap-1 animate-fade-up delay-200">
        <p className="font-display text-[10px] tracking-widest text-[var(--muted)] uppercase mb-3">Pontuação</p>
        <div className="divide-y divide-[var(--border)]">
          {[...players].sort((a, b) => b.pontuacao - a.pontuacao).map((p, i) => {
            const isEspia = espiaIds.includes(p.id);
            return (
              <div key={p.id} className="flex items-center gap-3 py-3">
                <span className="font-display text-xs text-[var(--muted)] w-4">{i + 1}</span>
                <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                  style={{ borderColor: isEspia ? "var(--crimson)" : "var(--gold-light)", background: isEspia ? "var(--crimson-bg)" : "var(--gold-bg)" }}>
                  <span className="font-display text-xs font-bold" style={{ color: isEspia ? "var(--crimson)" : "var(--gold)" }}>
                    {p.apelido.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-body font-bold text-sm text-[var(--stone)]">{p.apelido}</p>
                    {isEspia && (
                      <span className="text-[10px] font-display tracking-widest text-[var(--crimson)] border border-[var(--crimson)] rounded px-1.5 py-0.5">ESPIA</span>
                    )}
                    {!p.ativo && (
                      <span className="text-[10px] font-display tracking-widest text-[var(--muted)] border border-[var(--border)] rounded px-1.5 py-0.5">ELIMINADO</span>
                    )}
                  </div>
                </div>
                <span className="font-display font-bold text-lg" style={{ color: p.pontuacao > 0 ? "var(--gold)" : "var(--muted)" }}>
                  {p.pontuacao}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-3 animate-fade-up delay-300">
        {salaEncerrada ? (
          <Button variant="primary" size="lg" className="w-full font-display tracking-widest text-sm"
            onClick={() => router.push(`/sala/${code}/placar`)}>
            Ver Placar Final ✦
          </Button>
        ) : (
          <Button variant="primary" size="lg" className="w-full font-display tracking-widest text-sm"
            onClick={() => router.push(`/sala/${code}/lobby`)}>
            Próxima Rodada ✦
          </Button>
        )}
        <Button variant="ghost" size="md" className="w-full font-display tracking-widest text-sm"
          onClick={() => router.push("/")}>
          Encerrar Partida
        </Button>
      </div>
    </main>
  );
}
