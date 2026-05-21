"use client";
import Link from "next/link";
import { use, useState } from "react";
import { Button } from "@/components/ui/Button";

const MOCK_PLAYERS = [
  { id: "1", name: "Davi", isHost: true },
  { id: "2", name: "Ester" },
  { id: "3", name: "Moisés" },
  { id: "4", name: "Maria" },
];

function PlayerAvatar({ name, isHost }: { name: string; isHost?: boolean }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-[var(--gold-bg)] border-2 border-[var(--gold-light)] flex items-center justify-center">
          <span className="font-display text-sm font-bold text-[var(--gold)]">{initials}</span>
        </div>
        {isHost && (
          <span className="absolute -top-1 -right-1 text-[10px]">✦</span>
        )}
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
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="relative min-h-dvh flex flex-col px-5 pt-10 pb-10 max-w-sm mx-auto gap-6">

      {/* Header */}
      <header className="flex items-center justify-between animate-fade-up">
        <div>
          <p className="font-display text-[10px] tracking-[0.3em] text-[var(--muted)] uppercase">Sala de Espera</p>
          <h2 className="font-display text-xl font-bold text-[var(--stone)]">Missão Espia</h2>
        </div>
        <Link href="/" className="text-xs text-[var(--muted)] font-display tracking-wider hover:text-[var(--stone)] transition-colors">
          Sair
        </Link>
      </header>

      {/* Room code card */}
      <div className="card p-5 flex flex-col items-center gap-3 animate-fade-up delay-100 animate-pulse-gold">
        <p className="font-display text-[10px] tracking-[0.35em] text-[var(--muted)] uppercase">
          Compartilhe o Código
        </p>
        <div className="room-code">{code}</div>
        <button
          onClick={copyCode}
          className="text-xs font-display tracking-widest text-[var(--gold)] hover:text-[var(--gold-light)] transition-colors"
        >
          {copied ? "✓ Copiado!" : "Toque para copiar"}
        </button>
      </div>

      {/* Players */}
      <div className="card p-5 flex flex-col gap-1 animate-fade-up delay-200 flex-1">
        <div className="flex items-center justify-between mb-2">
          <p className="font-display text-[10px] tracking-widest text-[var(--muted)] uppercase">
            Jogadores
          </p>
          <span className="text-xs font-body text-[var(--muted)]">{MOCK_PLAYERS.length} / 12</span>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {MOCK_PLAYERS.map(p => (
            <PlayerAvatar key={p.id} name={p.name} isHost={p.isHost} />
          ))}
        </div>

        {/* Waiting indicator */}
        <div className="mt-3 text-center">
          <p className="text-xs text-[var(--muted)] font-light italic">
            Aguardando mais jogadores...
          </p>
        </div>
      </div>

      {/* Rules summary */}
      <div className="rounded-2xl bg-[var(--gold-bg)] border border-[var(--gold-light)]/30 p-4 animate-fade-up delay-300">
        <p className="font-display text-[10px] tracking-widest text-[var(--gold)] uppercase mb-2">Como Jogar</p>
        <p className="text-xs text-[var(--stone-mid)] leading-relaxed font-light">
          Todos recebem a carta do evento — exceto o <strong>espia</strong>, que recebe uma carta em branco.
          Façam perguntas, desconfiem uns dos outros, e descubram quem está mentindo.
        </p>
      </div>

      {/* Start button (host only) */}
      <div className="animate-fade-up delay-400">
        <Link href={`/sala/${code}/jogo`}>
          <Button variant="primary" size="lg" className="w-full font-display tracking-widest text-sm">
            Iniciar Partida ✦
          </Button>
        </Link>
        <p className="text-center text-[10px] text-[var(--muted)] mt-2 font-display tracking-wider">
          Somente o anfitrião pode iniciar
        </p>
      </div>
    </main>
  );
}
