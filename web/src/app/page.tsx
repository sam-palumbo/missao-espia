"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

function Seal() {
  return (
    <svg viewBox="0 0 120 120" className="w-36 h-36 animate-float" aria-hidden>
      <circle cx="60" cy="60" r="56" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx="60" cy="60" r="46" fill="none" stroke="var(--gold-light)" strokeWidth="0.75" />
      <g transform="translate(60,60)" fill="var(--gold)">
        <polygon points="0,-22 4,-8 18,-8 7,0 11,14 0,6 -11,14 -7,0 -18,-8 -4,-8" opacity="0.9"/>
        <circle cx="0" cy="0" r="5" fill="var(--parchment)"/>
        <circle cx="0" cy="0" r="2.5" />
      </g>
      <path id="topArc" d="M 10,60 A 50,50 0 0,1 110,60" fill="none"/>
      <text fontSize="6.5" fill="var(--gold)" letterSpacing="3" fontFamily="Cinzel, serif">
        <textPath href="#topArc" startOffset="10%">MISSÃO ESPIA · BÍBLIA ·</textPath>
      </text>
    </svg>
  );
}

function BgDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-25"
        style={{ background: "radial-gradient(circle, var(--gold-light) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-16 -right-8 w-56 h-56 rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)" }} />
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--stone)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

export default function HomePage() {
  const [mode, setMode] = useState<"home" | "entrar">("home");
  const [code, setCode] = useState("");

  return (
    <main className="relative min-h-dvh flex flex-col items-center justify-between px-5 pt-12 pb-10 max-w-sm mx-auto overflow-hidden">
      <BgDecoration />

      {/* Header */}
      <header className="relative z-10 text-center animate-fade-up">
        <p className="font-display text-[10px] tracking-[0.35em] text-[var(--gold)] uppercase mb-4">
          Jogo de Dedução Social
        </p>
        <div className="ornament mb-4">
          <span>✦</span>
        </div>
        <h1 className="font-display text-[2.75rem] font-black text-[var(--stone)] leading-none tracking-wider">
          Missão
          <br />
          <span style={{ WebkitTextStroke: "1.5px var(--stone)", color: "transparent" }}>
            Espia
          </span>
        </h1>
      </header>

      {/* Center seal */}
      <div className="relative z-10 flex flex-col items-center gap-4 animate-fade-up delay-200">
        <Seal />
        <p className="text-sm text-[var(--muted)] text-center max-w-[220px] leading-relaxed font-light italic">
          &ldquo;Quem entre vocês está escondendo a verdade?&rdquo;
        </p>
      </div>

      {/* Actions */}
      <div className="relative z-10 w-full flex flex-col gap-3 animate-fade-up delay-400">
        {mode === "home" ? (
          <>
            <Link href="/criar" className="w-full">
              <Button variant="primary" size="lg" className="w-full font-display tracking-widest text-sm">
                ✦ Criar Sala
              </Button>
            </Link>

            <Button
              variant="secondary"
              size="lg"
              className="w-full font-display tracking-widest text-sm"
              onClick={() => setMode("entrar")}
            >
              Entrar em Sala
            </Button>

            <div className="ornament my-1">
              <span className="text-[10px] tracking-[0.3em] text-[var(--muted)] font-display">OU</span>
            </div>

            <button className="text-xs text-[var(--muted)] hover:text-[var(--gold)] transition-colors font-display tracking-widest py-1">
              Entrar com Google
            </button>
          </>
        ) : (
          <>
            <div className="card p-5 flex flex-col gap-4 animate-scale-in">
              <p className="font-display text-[10px] tracking-[0.3em] text-center text-[var(--muted)] uppercase">
                Código da Sala
              </p>
              <input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={4}
                placeholder="ABCD"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                className="text-center text-4xl tracking-[0.4em] font-display font-bold py-4 bg-[var(--parchment)] rounded-xl border-2 border-[var(--border)] focus:border-[var(--gold)] outline-none transition-all w-full text-[var(--stone)]"
              />
              <Link href={code.length === 4 ? `/entrar?code=${code}` : "#"}>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full font-display tracking-widest text-sm"
                  disabled={code.length < 4}
                >
                  Entrar →
                </Button>
              </Link>
            </div>

            <button
              onClick={() => { setMode("home"); setCode(""); }}
              className="text-sm text-[var(--muted)] hover:text-[var(--stone)] transition-colors mt-1 font-display tracking-wider"
            >
              ← Voltar
            </button>
          </>
        )}
      </div>
    </main>
  );
}
