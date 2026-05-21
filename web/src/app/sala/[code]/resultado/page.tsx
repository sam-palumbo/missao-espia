"use client";
import Link from "next/link";
import { use, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EVENTOS } from "@/lib/eventos";

const MOCK_EVENTO = EVENTOS[6]; // Êxodo
const MOCK_RESULTS = [
  { name: "Davi",   isSpy: false, points: 1, active: true },
  { name: "Ester",  isSpy: true,  points: 0, active: true, guessedRight: false },
  { name: "Moisés", isSpy: false, points: 1, active: true },
  { name: "Maria",  isSpy: false, points: 0, active: false },
  { name: "Pedro",  isSpy: false, points: 1, active: true },
  { name: "Paulo",  isSpy: false, points: 1, active: true },
];

export default function ResultadoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [revealed, setRevealed] = useState(false);

  const spy = MOCK_RESULTS.find(p => p.isSpy);
  const groupWon = !spy?.guessedRight;

  return (
    <main className="relative min-h-dvh flex flex-col px-5 pt-10 pb-10 max-w-sm mx-auto gap-6 overflow-hidden">

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${groupWon ? "var(--gold-light)" : "var(--crimson)"} 0%, transparent 70%)` }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 text-center animate-fade-up">
        <p className="font-display text-[10px] tracking-[0.35em] text-[var(--muted)] uppercase mb-3">
          Resultado da Rodada
        </p>
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-display tracking-widest mb-3"
          style={{
            borderColor: groupWon ? "var(--gold-light)" : "var(--crimson)",
            color: groupWon ? "var(--gold)" : "var(--crimson)",
            background: groupWon ? "var(--gold-bg)" : "var(--crimson-bg)",
          }}
        >
          {groupWon ? "✦ Grupo Venceu" : "Espia Venceu"}
        </div>
        <h2 className="font-display text-3xl font-black text-[var(--stone)] leading-tight">
          {groupWon ? "Espia\nDesmascarado" : "Missão\nCumprida"}
        </h2>
      </header>

      {/* Event reveal */}
      <button
        className="relative z-10 card p-5 text-center flex flex-col items-center gap-3 w-full animate-fade-up delay-100 active:scale-[0.98] transition-transform"
        onClick={() => setRevealed(true)}
      >
        {revealed ? (
          <>
            <p className="font-display text-[10px] tracking-[0.3em] text-[var(--gold)] uppercase">
              {MOCK_EVENTO.testament === "AT" ? "Antigo Testamento" : "Novo Testamento"}
            </p>
            <p className="font-display text-xl font-bold text-[var(--stone)]">{MOCK_EVENTO.evento}</p>
            <p className="text-sm text-[var(--muted)] font-light">{MOCK_EVENTO.local}</p>
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

      {/* Score list */}
      <div className="relative z-10 card p-5 flex flex-col gap-1 animate-fade-up delay-200">
        <p className="font-display text-[10px] tracking-widest text-[var(--muted)] uppercase mb-3">Pontuação</p>
        <div className="divide-y divide-[var(--border)]">
          {MOCK_RESULTS.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3 py-3">
              <span className="font-display text-xs text-[var(--muted)] w-4">{i + 1}</span>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                style={{
                  borderColor: p.isSpy ? "var(--crimson)" : "var(--gold-light)",
                  background: p.isSpy ? "var(--crimson-bg)" : "var(--gold-bg)",
                }}
              >
                <span
                  className="font-display text-xs font-bold"
                  style={{ color: p.isSpy ? "var(--crimson)" : "var(--gold)" }}
                >
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-body font-bold text-sm text-[var(--stone)]">{p.name}</p>
                  {p.isSpy && (
                    <span className="text-[10px] font-display tracking-widest text-[var(--crimson)] border border-[var(--crimson)] rounded px-1.5 py-0.5">
                      ESPIA
                    </span>
                  )}
                  {!p.active && (
                    <span className="text-[10px] font-display tracking-widest text-[var(--muted)] border border-[var(--border)] rounded px-1.5 py-0.5">
                      ELIMINADO
                    </span>
                  )}
                </div>
              </div>
              <span
                className="font-display font-bold text-lg"
                style={{ color: p.points > 0 ? "var(--gold)" : "var(--muted)" }}
              >
                +{p.points}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="relative z-10 flex flex-col gap-3 animate-fade-up delay-300">
        <Link href={`/sala/${code}/lobby`}>
          <Button variant="primary" size="lg" className="w-full font-display tracking-widest text-sm">
            Nova Rodada ✦
          </Button>
        </Link>
        <Link href="/">
          <Button variant="ghost" size="md" className="w-full font-display tracking-widest text-sm">
            Encerrar Partida
          </Button>
        </Link>
      </div>
    </main>
  );
}
