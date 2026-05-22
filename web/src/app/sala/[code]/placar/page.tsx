"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { usePlayers } from "@/hooks/usePlayers";
import { createClient } from "@/lib/supabase";

export default function PlacarPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [salaId, setSalaId] = useState<string | null>(null);
  const players = usePlayers(salaId);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("salas").select("id").eq("codigo", code).single()
      .then(({ data }) => { if (data) setSalaId(data.id); });
  }, [code]);

  const sorted = [...players].sort((a, b) => b.pontuacao - a.pontuacao);
  const max = sorted[0]?.pontuacao ?? 0;

  return (
    <main className="relative min-h-dvh flex flex-col px-5 pt-10 pb-10 max-w-sm mx-auto gap-6 overflow-hidden">

      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, var(--gold-light) 0%, transparent 70%)" }} />
      </div>

      <header className="relative z-10 text-center animate-fade-up">
        <p className="font-display text-[10px] tracking-[0.35em] text-[var(--muted)] uppercase mb-3">Partida Encerrada</p>
        <div className="ornament mb-3"><span className="text-[var(--gold)]">✦</span></div>
        <h2 className="font-display text-4xl font-black text-[var(--stone)] leading-none tracking-wider">
          Placar<br />
          <span style={{ WebkitTextStroke: "1.5px var(--stone)", color: "transparent" }}>Final</span>
        </h2>
      </header>

      <div className="relative z-10 card p-5 flex flex-col gap-1 animate-fade-up delay-100">
        <p className="font-display text-[10px] tracking-widest text-[var(--muted)] uppercase mb-3">Classificação</p>
        <div className="divide-y divide-[var(--border)]">
          {sorted.map((p, i) => {
            const isFirst = i === 0 && p.pontuacao > 0;
            const barPct = max > 0 ? (p.pontuacao / max) * 100 : 0;
            return (
              <div key={p.id} className="flex items-center gap-3 py-3">
                <span className="font-display text-sm w-5 text-center"
                  style={{ color: isFirst ? "var(--gold)" : "var(--muted)" }}>
                  {isFirst ? "✦" : `${i + 1}`}
                </span>
                <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                  style={{
                    borderColor: isFirst ? "var(--gold)" : "var(--border)",
                    background: isFirst ? "var(--gold-bg)" : "white",
                  }}>
                  <span className="font-display text-xs font-bold"
                    style={{ color: isFirst ? "var(--gold)" : "var(--muted)" }}>
                    {p.apelido.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <p className="font-body font-bold text-sm text-[var(--stone)]">{p.apelido}</p>
                  <div className="h-1 rounded-full bg-[var(--border)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${barPct}%`, background: isFirst ? "var(--gold)" : "var(--stone-mid)" }} />
                  </div>
                </div>
                <span className="font-display font-black text-xl w-8 text-right"
                  style={{ color: isFirst ? "var(--gold)" : "var(--stone)" }}>
                  {p.pontuacao}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-3 animate-fade-up delay-200">
        <Button variant="primary" size="lg" className="w-full font-display tracking-widest text-sm"
          onClick={() => router.push("/")}>
          Nova Partida ✦
        </Button>
        <Button variant="ghost" size="md" className="w-full font-display tracking-widest text-sm"
          onClick={() => router.push("/")}>
          Encerrar
        </Button>
      </div>
    </main>
  );
}
